export interface WeeklyReport {
  week_start: string
  week_end: string
  revenue_paid: number
  payments_paid_count: number
  ads_spend: number
  ads_gmv: number
  ads_avg_roi: number | null
  tasks_done: number
  open_tasks: number
  new_leads: number
  content_delivered: number
  contracts_expiring_14d: number
}

export type { ReportInsight as WeeklyInsight } from '../reports/types'
