export interface AdvancedReport {
  month: string
  revenue_paid: number
  payments_paid_count: number
  pending_receivables: number
  active_customers: number
  contracts_expiring_30d: number
  ads_spend: number
  ads_gmv: number
  ads_avg_roi: number | null
  content_delivered: number
  open_tasks: number
}

export interface ReportInsight {
  id: string
  severity: 'info' | 'warn' | 'danger'
  title: string
  body: string
  link?: string
}
