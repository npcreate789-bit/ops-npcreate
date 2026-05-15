import type { WeeklyReport } from '../types'

export const mockWeeklyApi = {
  async fetch(weekStart: string, weekEnd: string): Promise<WeeklyReport> {
    return {
      week_start: weekStart,
      week_end: weekEnd,
      revenue_paid: 185_000,
      payments_paid_count: 3,
      ads_spend: 42_000,
      ads_gmv: 128_000,
      ads_avg_roi: 2.1,
      tasks_done: 12,
      open_tasks: 8,
      new_leads: 4,
      content_delivered: 6,
      contracts_expiring_14d: 2,
    }
  },
}
