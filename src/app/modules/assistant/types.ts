import type { ClientReport } from '../client/types'

export type StaffPromptKey =
  | 'crm_followup'
  | 'renewal_pitch'
  | 'content_brief'
  | 'ads_summary'
  | 'onboarding_checkin'

export type ClientQuestionKey =
  | 'ads_performance'
  | 'onboarding_status'
  | 'delivered_content'
  | 'contract_info'

export interface StaffCustomerContext {
  brand_name: string
  status: string
  contract_end: string | null
  ready_for_ads: boolean
  onboarding_progress: number | null
  open_tasks: number | null
}

export interface StaffAdsMetrics {
  last_7_days_spend: number
  last_7_days_gmv: number
  last_7_days_roi: number | null
  latest_report_date: string | null
}

export interface StaffReplyInput {
  promptKey: StaffPromptKey
  customer: StaffCustomerContext | null
  adsMetrics?: StaffAdsMetrics | null
  userDisplayName?: string
}

export interface ClientReplyInput {
  report: ClientReport
  questionKey: ClientQuestionKey
}
