import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { addDaysIso, daysUntilContractEnd } from '../constants'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import type {
  ContractRenewal,
  ContractRenewalStatus,
  RenewalFilters,
  RenewalInput,
  RenewalRow,
} from '../types'
import { mockRenewalsApi } from './mockStore'

function mapRenewal(row: Record<string, unknown>): ContractRenewal {
  return {
    id: row.id as string,
    customer_id: row.customer_id as string,
    status: row.status as ContractRenewalStatus,
    contract_end: row.contract_end as string,
    extension_months: row.extension_months != null ? Number(row.extension_months) : null,
    owner_id: row.owner_id as string,
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listRenewalRows(filters: RenewalFilters): Promise<RenewalRow[]> {
  if (!isSupabaseConfigured || !supabase) return mockRenewalsApi.list(filters)

  const within = filters.within_days ?? 60
  const today = bangkokTodayIsoDate()
  const limit = addDaysIso(today, within)

  let query = supabase
    .from('customers')
    .select(
      'id, brand_name, status, contract_end, account_owner_id, contract_renewals(id, status, owner_id, notes)',
    )
    .in('status', ['active', 'at_risk'])
    .not('contract_end', 'is', null)
    .lte('contract_end', limit)
    .order('contract_end')

  if (!filters.include_expired) {
    query = query.gte('contract_end', today)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  let rows: RenewalRow[] = (data ?? []).map((c) => {
    const renewals = (c.contract_renewals ?? []) as Record<string, unknown>[]
    const active = renewals.find(
      (r) => !['renewed', 'declined'].includes(r.status as string),
    )
    const renewal = active ? mapRenewal({ ...active, customer_id: c.id, contract_end: c.contract_end }) : null
    return {
      customer_id: c.id as string,
      brand_name: c.brand_name as string,
      contract_end: c.contract_end as string,
      customer_status: c.status as string,
      days_until_end: daysUntilContractEnd(c.contract_end as string),
      renewal_id: renewal?.id ?? null,
      renewal_status: renewal?.status ?? null,
      owner_id: renewal?.owner_id ?? (c.account_owner_id as string | null),
      notes: renewal?.notes ?? null,
    }
  })

  if (filters.renewal_status) {
    rows = rows.filter((row) => {
      if (filters.renewal_status === 'no_case') return row.renewal_status == null
      return row.renewal_status === filters.renewal_status
    })
  }

  const q = filters.search?.trim().toLowerCase()
  if (q) rows = rows.filter((r) => r.brand_name.toLowerCase().includes(q))

  if (filters.customer_id) {
    rows = rows.filter((r) => r.customer_id === filters.customer_id)
  }

  return rows
}

export async function countExpiringContracts(withinDays: number): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return mockRenewalsApi.countExpiring(withinDays)

  const today = bangkokTodayIsoDate()
  const limit = addDaysIso(today, withinDays)

  const { count, error } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'at_risk'])
    .not('contract_end', 'is', null)
    .gte('contract_end', today)
    .lte('contract_end', limit)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function upsertRenewal(input: RenewalInput): Promise<ContractRenewal> {
  if (!isSupabaseConfigured || !supabase) return mockRenewalsApi.upsert(input)

  const { data: existingRows, error: findErr } = await supabase
    .from('contract_renewals')
    .select('id, status')
    .eq('customer_id', input.customer_id)

  if (findErr) throw new Error(findErr.message)

  const existing = (existingRows ?? []).find(
    (r) => !['renewed', 'declined'].includes(r.status as string),
  )

  if (existing?.id) {
    const { data, error } = await supabase
      .from('contract_renewals')
      .update({
        status: input.status,
        owner_id: input.owner_id,
        notes: input.notes,
      })
      .eq('id', existing.id as string)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    await logAudit('renewal.update', 'contract_renewal', data.id as string)
    return mapRenewal(data)
  }

  const { data, error } = await supabase
    .from('contract_renewals')
    .insert({
      customer_id: input.customer_id,
      status: input.status,
      contract_end: input.contract_end,
      owner_id: input.owner_id,
      notes: input.notes,
      created_by: input.created_by,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  await logAudit('renewal.create', 'contract_renewal', data.id as string)
  return mapRenewal(data)
}

export async function extendCustomerContract(
  customerId: string,
  months: number,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockRenewalsApi.extendContract(customerId, months)
    return
  }

  const { error } = await supabase.rpc('extend_customer_contract', {
    p_customer_id: customerId,
    p_months: months,
  })
  if (error) throw new Error(error.message)

  const { data: renewals, error: renErr } = await supabase
    .from('contract_renewals')
    .select('id, status')
    .eq('customer_id', customerId)

  if (renErr) throw new Error(renErr.message)

  const active = (renewals ?? []).find(
    (r) => !['renewed', 'declined'].includes(r.status as string),
  )

  if (active?.id) {
    const { error: upErr } = await supabase
      .from('contract_renewals')
      .update({ status: 'renewed', extension_months: months })
      .eq('id', active.id as string)
    if (upErr) throw new Error(upErr.message)
  }

  await logAudit('customer.contract_extend', 'customer', customerId, { months })
}
