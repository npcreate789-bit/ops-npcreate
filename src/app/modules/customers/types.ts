export type CustomerStatus = 'pending' | 'active' | 'at_risk' | 'ended'

export interface CustomerListRow {
  id: string
  brand_name: string
  contact_name: string | null
  status: CustomerStatus
  package_name: string | null
  contract_start: string | null
  contract_end: string | null
  ready_for_ads: boolean
  phone: string | null
}

export interface Customer360Summary {
  payments_count: number
  payments_paid_total: number
  payments_pending: number
  open_tasks: number
  content_in_progress: number
  campaigns_count: number
  ads_spend_30d: number
  renewal_status: string | null
}

export interface Customer360 {
  customer: CustomerListRow & {
    line_id: string | null
    business_type: string | null
    lead_id: string | null
  }
  summary: Customer360Summary
}

export interface CustomerListFilters {
  search: string
  status: CustomerStatus | ''
}

export type CustomerTimelineKind =
  | 'task'
  | 'payment'
  | 'content'
  | 'contract'
  | 'activity'
  | 'lead'

export interface CustomerTimelineEntry {
  id: string
  kind: CustomerTimelineKind
  at: string
  title: string
  detail: string
  href: string
  overdue: boolean
}

export interface CustomerTimelineFilters {
  within_days: number
  lookback_days: number
  kind: CustomerTimelineKind | ''
}

export interface CustomerTimelineContext {
  customerId: string
  leadId: string | null
  contractEnd: string | null
  brandName: string
}
