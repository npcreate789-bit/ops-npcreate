export interface ClientReport {
  customer: {
    id: string
    brand_name: string
    status: string
    contract_end: string | null
    ready_for_ads: boolean
  }
  onboarding_progress: number
  ads_summary: {
    last_7_days_spend: number
    last_7_days_gmv: number
    last_7_days_roi: number | null
    latest_report_date: string | null
  }
  delivered_content: {
    id: string
    title: string
    format: string
    deliverable_url: string | null
    delivered_at: string | null
  }[]
}
