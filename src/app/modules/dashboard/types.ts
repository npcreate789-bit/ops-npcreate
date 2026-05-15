import type { ContentJobSummary } from '../content/types'
import type { FinanceSummary } from '../finance/types'
import type { TaskSummary } from '../tasks/types'

export interface CustomerStats {
  active: number
  pending_onboarding: number
  ready_for_ads: number
}

export interface LeadStats {
  total: number
  pipeline: number
  won: number
}

export interface AdsStats {
  spend_today: number
  gmv_today: number
  avg_roi: number | null
  reports_submitted: number
  reports_expected: number
}

export interface DashboardAlert {
  id: string
  severity: 'warn' | 'danger'
  message: string
  link: string
}

export interface ExecutiveDashboard {
  finance: FinanceSummary
  leads: LeadStats
  customers: CustomerStats
  ads: AdsStats
  tasks: TaskSummary
  content: ContentJobSummary
  alerts: DashboardAlert[]
}
