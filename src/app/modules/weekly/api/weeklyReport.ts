import { bangkokTodayIsoDate, bangkokWeekStartIso } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { addDaysIso } from '../../timeline/constants'
import { countExpiringContracts } from '../../renewals/api/renewals'
import type { WeeklyReport } from '../types'
import { mockWeeklyApi } from './mockStore'

async function safeCount<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export function currentWeekRange(): { week_start: string; week_end: string } {
  const week_start = bangkokWeekStartIso()
  const week_end = addDaysIso(week_start, 6)
  const today = bangkokTodayIsoDate()
  return { week_start, week_end: week_end > today ? today : week_end }
}

export async function fetchWeeklyReport(
  weekStart?: string,
): Promise<WeeklyReport> {
  const { week_start, week_end } = weekStart
    ? { week_start: weekStart, week_end: addDaysIso(weekStart, 6) }
    : currentWeekRange()

  if (!isSupabaseConfigured || !supabase) {
    return mockWeeklyApi.fetch(week_start, week_end)
  }

  const revenue = await safeCount(async () => {
    const { data, error } = await supabase!
      .from('payments')
      .select('total_amount, status, payment_date')
      .gte('payment_date', week_start)
      .lte('payment_date', week_end)
    if (error) throw error
    let revenue_paid = 0
    let payments_paid_count = 0
    for (const row of data ?? []) {
      if (row.status === 'paid') {
        revenue_paid += Number(row.total_amount)
        payments_paid_count += 1
      }
    }
    return { revenue_paid, payments_paid_count }
  }, { revenue_paid: 0, payments_paid_count: 0 })

  const ads = await safeCount(async () => {
    const { data, error } = await supabase!
      .from('daily_metrics')
      .select('spend, gmv, roi, report_date')
      .gte('report_date', week_start)
      .lte('report_date', week_end)
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

  const tasks_done = await safeCount(async () => {
    const { count, error } = await supabase!
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'done')
      .gte('completed_at', `${week_start}T00:00:00+07:00`)
      .lte('completed_at', `${week_end}T23:59:59+07:00`)
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

  const new_leads = await safeCount(async () => {
    const { count, error } = await supabase!
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${week_start}T00:00:00+07:00`)
      .lte('created_at', `${week_end}T23:59:59+07:00`)
    if (error) throw error
    return count ?? 0
  }, 0)

  const content_delivered = await safeCount(async () => {
    const { count, error } = await supabase!
      .from('content_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .gte('delivered_at', `${week_start}T00:00:00+07:00`)
      .lte('delivered_at', `${week_end}T23:59:59+07:00`)
    if (error) throw error
    return count ?? 0
  }, 0)

  const contracts_expiring_14d = await safeCount(() => countExpiringContracts(14), 0)

  return {
    week_start,
    week_end,
    ...revenue,
    ...ads,
    tasks_done,
    open_tasks,
    new_leads,
    content_delivered,
    contracts_expiring_14d,
  }
}
