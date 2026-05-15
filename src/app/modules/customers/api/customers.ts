import { addDaysIso } from '../../renewals/constants'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { Customer360, CustomerListFilters, CustomerListRow } from '../types'
import { mockCustomersApi } from './mockStore'

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try {
    return await fn()
  } catch {
    return 0
  }
}

export async function listCustomers(
  filters: CustomerListFilters = { search: '', status: '' },
): Promise<CustomerListRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCustomersApi.list(filters)
  }

  let query = supabase
    .from('customers')
    .select(
      'id, brand_name, contact_name, status, package_name, contract_start, contract_end, ready_for_ads, phone',
    )
    .order('brand_name')

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []) as CustomerListRow[]

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        r.brand_name.toLowerCase().includes(q) ||
        (r.contact_name?.toLowerCase().includes(q) ?? false) ||
        (r.phone?.includes(q) ?? false),
    )
  }

  return rows
}

export async function getCustomer360(customerId: string): Promise<Customer360 | null> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCustomersApi.get360(customerId)
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .select(
      'id, brand_name, contact_name, status, package_name, contract_start, contract_end, ready_for_ads, phone, line_id, business_type, lead_id',
    )
    .eq('id', customerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!customer) return null

  const since30 = addDaysIso(bangkokTodayIsoDate(), -30)

  const [
    payments_count,
    payments_paid_total,
    payments_pending,
    open_tasks,
    content_in_progress,
    campaigns_count,
    ads_spend_30d,
    renewal_status,
  ] = await Promise.all([
    safeCount(async () => {
      const { count, error: e } = await supabase!
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
      if (e) throw e
      return count ?? 0
    }),
    safeCount(async () => {
      const { data, error: e } = await supabase!
        .from('payments')
        .select('total_amount, status')
        .eq('customer_id', customerId)
        .eq('status', 'paid')
      if (e) throw e
      return (data ?? []).reduce((s, r) => s + Number(r.total_amount), 0)
    }),
    safeCount(async () => {
      const { count, error: e } = await supabase!
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .in('status', ['pending', 'overdue'])
      if (e) throw e
      return count ?? 0
    }),
    safeCount(async () => {
      const { count, error: e } = await supabase!
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .neq('status', 'done')
      if (e) throw e
      return count ?? 0
    }),
    safeCount(async () => {
      const { count, error: e } = await supabase!
        .from('content_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .in('status', ['briefed', 'in_production', 'review'])
      if (e) throw e
      return count ?? 0
    }),
    safeCount(async () => {
      const { count, error: e } = await supabase!
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId)
      if (e) throw e
      return count ?? 0
    }),
    safeCount(async () => {
      const { data: camps, error: ce } = await supabase!
        .from('campaigns')
        .select('id')
        .eq('customer_id', customerId)
      if (ce) throw ce
      const ids = (camps ?? []).map((c) => c.id as string)
      if (ids.length === 0) return 0
      const { data, error: e } = await supabase!
        .from('daily_metrics')
        .select('spend')
        .in('campaign_id', ids)
        .gte('report_date', since30)
      if (e) throw e
      return (data ?? []).reduce((s, r) => s + Number(r.spend ?? 0), 0)
    }),
    (async () => {
      try {
        const { data, error: e } = await supabase!
          .from('contract_renewals')
          .select('status')
          .eq('customer_id', customerId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (e) throw e
        return (data?.status as string) ?? null
      } catch {
        return null
      }
    })(),
  ])

  return {
    customer: customer as Customer360['customer'],
    summary: {
      payments_count,
      payments_paid_total,
      payments_pending,
      open_tasks,
      content_in_progress,
      campaigns_count,
      ads_spend_30d,
      renewal_status,
    },
  }
}
