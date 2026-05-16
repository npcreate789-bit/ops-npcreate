import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { updateLead } from '../../crm/api/leads'
import type { LeadStatus } from '../../crm/types'
import type { Quotation, QuotationInput, Package, QuotationStatus } from '../types'
import { calcQuotationTotals } from '../constants'
import { mockSalesApi } from './mockStore'

export async function listPackages(): Promise<Package[]> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.listPackages()
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as Package[]
}

export async function listQuotations(): Promise<Quotation[]> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.listQuotations()

  const { data, error } = await supabase
    .from('quotations')
    .select('*, leads(brand_name)')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const leads = r.leads as { brand_name: string } | null
    return {
      ...(r as unknown as Quotation),
      lead_brand_name: leads?.brand_name ?? null,
    }
  })
}

export async function getQuotation(id: string): Promise<Quotation | null> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.getQuotation(id)

  const { data: q, error } = await supabase
    .from('quotations')
    .select('*, leads(brand_name)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!q) return null

  const { data: items, error: itemsError } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', id)
    .order('sort_order')

  if (itemsError) throw new Error(itemsError.message)

  const row = q as Record<string, unknown>
  const leads = row.leads as { brand_name: string } | null

  return {
    ...(row as unknown as Quotation),
    lead_brand_name: leads?.brand_name ?? null,
    items: items ?? [],
  }
}

async function syncItems(quotationId: string, input: QuotationInput) {
  if (!supabase) return
  await supabase.from('quotation_items').delete().eq('quotation_id', quotationId)
  if (!input.items.length) return
  const rows = input.items.map((item, i) => ({
    quotation_id: quotationId,
    package_id: item.package_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
    sort_order: item.sort_order ?? i,
  }))
  const { error } = await supabase.from('quotation_items').insert(rows)
  if (error) throw new Error(error.message)
}

export async function createQuotation(input: QuotationInput): Promise<Quotation> {
  if (!isSupabaseConfigured || !supabase) {
    const created = await mockSalesApi.createQuotation(input)
    await syncLeadStatusFromQuotation(input)
    await linkCustomerForQuotation(created.id, input)
    return (await mockSalesApi.getQuotation(created.id)) ?? created
  }

  const totals = calcQuotationTotals(input.items, input.discount, input.vat_rate)
  const { data: numData, error: numError } = await supabase.rpc('next_quotation_number')
  if (numError) throw new Error(numError.message)

  const now = new Date().toISOString()
  const marksSent = ['sent', 'awaiting_payment', 'paid'].includes(input.status)
  const { data, error } = await supabase
    .from('quotations')
    .insert({
      quotation_number: numData as string,
      lead_id: input.lead_id,
      owner_id: input.owner_id,
      status: input.status,
      subtotal: totals.subtotal,
      discount: input.discount,
      vat_rate: input.vat_rate,
      vat_amount: totals.vat_amount,
      total: totals.total,
      contract_months: input.contract_months,
      terms: input.terms,
      notes: input.notes,
      sent_at: marksSent ? now : null,
      paid_at: input.status === 'paid' ? now : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const quotationId = data.id as string
  await syncItems(quotationId, input)
  await syncLeadStatusFromQuotation(input)

  await linkCustomerForQuotation(quotationId, input)

  await logAudit('quotation.create', 'quotation', quotationId, {
    quotation_number: data.quotation_number,
    status: input.status,
    lead_id: input.lead_id,
  })

  return (await getQuotation(quotationId))!
}

export async function updateQuotation(id: string, input: QuotationInput): Promise<Quotation> {
  if (!isSupabaseConfigured || !supabase) {
    const updated = await mockSalesApi.updateQuotation(id, input)
    await syncLeadStatusFromQuotation(input)
    await linkCustomerForQuotation(id, input)
    return (await mockSalesApi.getQuotation(id)) ?? updated
  }

  const totals = calcQuotationTotals(input.items, input.discount, input.vat_rate)
  const now = new Date().toISOString()
  const existing = await getQuotation(id)

  const { error } = await supabase
    .from('quotations')
    .update({
      lead_id: input.lead_id,
      status: input.status,
      subtotal: totals.subtotal,
      discount: input.discount,
      vat_rate: input.vat_rate,
      vat_amount: totals.vat_amount,
      total: totals.total,
      contract_months: input.contract_months,
      terms: input.terms,
      notes: input.notes,
      sent_at:
        ['sent', 'awaiting_payment', 'paid'].includes(input.status) && !existing?.sent_at
          ? now
          : existing?.sent_at,
      paid_at:
        input.status === 'paid' ? (existing?.paid_at ?? now) : existing?.paid_at ?? null,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  await syncItems(id, input)
  await syncLeadStatusFromQuotation(input)

  await linkCustomerForQuotation(id, input)

  await logAudit('quotation.update', 'quotation', id, {
    status: input.status,
    lead_id: input.lead_id,
  })

  return (await getQuotation(id))!
}

const CUSTOMER_LINK_STATUSES: QuotationStatus[] = ['sent', 'awaiting_payment', 'paid']

async function linkCustomerForQuotation(quotationId: string, input: QuotationInput) {
  if (!input.lead_id || !CUSTOMER_LINK_STATUSES.includes(input.status)) return

  const customerId =
    input.status === 'paid'
      ? await promoteLeadToCustomer(input.lead_id)
      : await ensureCustomerFromLead(input.lead_id)

  if (isSupabaseConfigured && supabase) {
    await supabase.from('quotations').update({ customer_id: customerId }).eq('id', quotationId)
  }
}

async function syncLeadStatusFromQuotation(input: QuotationInput) {
  if (!input.lead_id) return
  const statusMap: Record<string, string> = {
    draft: 'scheduled',
    sent: 'quotation_sent',
    awaiting_payment: 'awaiting_payment',
    paid: 'won',
  }
  const leadStatus = statusMap[input.status]
  if (leadStatus) {
    await updateLead(input.lead_id, { status: leadStatus as LeadStatus })
  }
}

export async function ensureCustomerFromLead(leadId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const q = (await mockSalesApi.listQuotations()).find((x) => x.lead_id === leadId)
    if (!q) throw new Error('ไม่พบใบเสนอราคาสำหรับ Lead')
    return mockSalesApi.ensureCustomer(leadId, q)
  }

  const { data, error } = await supabase.rpc('ensure_customer_from_lead', {
    p_lead_id: leadId,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function promoteLeadToCustomer(leadId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const q = (await mockSalesApi.listQuotations()).find((x) => x.lead_id === leadId)
    if (!q) throw new Error('ไม่พบใบเสนอราคาสำหรับ Lead')
    return mockSalesApi.promoteLead(leadId, q)
  }

  const { data, error } = await supabase.rpc('promote_lead_to_customer', {
    p_lead_id: leadId,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function deleteQuotation(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return mockSalesApi.deleteQuotation(id)
  const { error } = await supabase.from('quotations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit('quotation.delete', 'quotation', id)
}
