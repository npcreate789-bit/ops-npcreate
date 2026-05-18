import { normalizeLoginId } from '../../../../shared/auth/loginId'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'
import type { ClientWizardCustomer, CreateClientInput, CreateClientResult } from '../types'
import { mockAdminApi } from './mockStore'

export async function listCustomersForClientWizard(): Promise<ClientWizardCustomer[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.listCustomersForClientWizard()
  }

  const [{ data: customers, error: cErr }, { data: links, error: lErr }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, brand_name, contact_name, status, lead_id')
      .order('brand_name'),
    supabase.from('client_customer_access').select('customer_id'),
  ])

  if (cErr) throw new Error(cErr.message)
  if (lErr) throw new Error(lErr.message)

  const linked = new Set((links ?? []).map((row) => row.customer_id as string))
  const leadIds = [
    ...new Set(
      (customers ?? [])
        .map((row) => row.lead_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  const lineByLead = new Map<string, string>()
  if (leadIds.length > 0) {
    const { data: leads, error: leadErr } = await supabase
      .from('leads')
      .select('id, line_user_id')
      .in('id', leadIds)
    if (leadErr) throw new Error(leadErr.message)
    for (const lead of leads ?? []) {
      const uid = (lead.line_user_id as string | null)?.trim()
      if (uid) lineByLead.set(lead.id as string, uid)
    }
  }

  return (customers ?? []).map((row) => {
    const leadId = row.lead_id as string | null
    return {
      id: row.id as string,
      brand_name: row.brand_name as string,
      contact_name: (row.contact_name as string | null) ?? null,
      status: row.status as string,
      has_portal: linked.has(row.id as string),
      line_user_id: leadId ? (lineByLead.get(leadId) ?? null) : null,
    }
  })
}

export async function createClientPortalUser(
  input: CreateClientInput,
): Promise<CreateClientResult> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.createClientPortalUser(input)
  }

  const { data, error } = await supabase.functions.invoke('create-client-user', {
    body: {
      login_id: normalizeLoginId(input.login_id),
      full_name: input.full_name.trim(),
      customer_id: input.customer_id,
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    if (message.includes('deploy Edge Function') || message.includes('Failed to send')) {
      throw new Error(
        'ยังไม่ได้ deploy Edge Function create-client-user — รัน: supabase functions deploy create-client-user',
      )
    }
    throw new Error(message)
  }

  const result = data as CreateClientResult | { error?: string } | null
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(result.error)
  }

  if (!result || typeof result !== 'object' || !('login_id' in result)) {
    throw new Error('สร้างบัญชีไม่สำเร็จ — ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์')
  }

  return result as CreateClientResult
}
