import { bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { countExpiringContracts } from '../../renewals/api/renewals'
import type { AdvancedReport } from '../types'
import { mockReportsApi } from './mockStore'

async function safeCount<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export async function fetchAdvancedReport(month?: string): Promise<AdvancedReport> {
  const monthPrefix = month ?? bangkokYearMonthPrefix()
  if (!isSupabaseConfigured || !supabase) return mockReportsApi.fetch(monthPrefix)

  const revenue = await safeCount(async () => {
    const { data, error } = await supabase!
      .from('payments')
      .select('total_amount, status, payment_date')
    if (error) throw error
    let revenue_paid = 0
    let payments_paid_count = 0
    let pending_receivables = 0
    for (const row of data ?? []) {
      const total = Number(row.total_amount)
      if (row.status === 'paid' && (row.payment_date as string)?.startsWith(monthPrefix)) {
        revenue_paid += total
        payments_paid_count += 1
      }
      if (row.status === 'pending' || row.status === 'overdue') pending_receivables += total
    }
    return { revenue_paid, payments_paid_count, pending_receivables }
  }, { revenue_paid: 0, payments_paid_count: 0, pending_receivables: 0 })

  const active_customers = await safeCount(async () => {
    const { count, error } = await supabase!
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    if (error) throw error
    return count ?? 0
  }, 0)

  const contracts_expiring_30d = await safeCount(
    () => countExpiringContracts(30),
    0,
  )

  const ads = await safeCount(async () => {
    const { data, error } = await supabase!
      .from('daily_metrics')
      .select('spend, gmv, roi, report_date')
      .gte('report_date', `${monthPrefix}-01`)
      .lte('report_date', `${monthPrefix}-31`)
    if (error) throw error
    let ads_spend = 0
    let ads_gmv = 0
    const rois: number[] = []
    for (const row of data ?? []) {
      ads_spend += Number(row.spend ?? 0)
      ads_gmv += Number(row.gmv ?? 0)
      const roi = Number(row.roi)
      if (!Number.isNaN(roi)) rois.push(roi)
    }
    return {
      ads_spend,
      ads_gmv,
      ads_avg_roi: rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : null,
    }
  }, { ads_spend: 0, ads_gmv: 0, ads_avg_roi: null })

  const content_delivered = await safeCount(async () => {
    const { count, error } = await supabase!
      .from('content_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('delivered_at', `${monthPrefix}-01T00:00:00+07:00`)
      .lte('delivered_at', `${monthPrefix}-31T23:59:59+07:00`)
    if (error) throw error
    return count ?? 0
  }, 0)

  const open_tasks = await safeCount(async () => {
    const { count, error } = await supabase!
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'done')
    if (error) throw error
    return count ?? 0
  }, 0)

  return {
    month: monthPrefix,
    ...revenue,
    active_customers,
    contracts_expiring_30d,
    ...ads,
    content_delivered,
    open_tasks,
  }
}
