export type CampaignStatus = 'active' | 'budget_unused' | 'low_roi' | 'needs_fix' | 'paused'

export interface AdsCustomerRow {
  id: string
  brand_name: string
  ready_for_ads: boolean
  ads_owner_id: string | null
  daily_budget: number | null
  campaign_id: string | null
  today_submitted: boolean
  today_reported_at: string | null
  yesterday_roi: number | null
}

export interface Campaign {
  id: string
  customer_id: string
  ads_owner_id: string
  name: string
  campaign_type: string
  daily_budget: number | null
  status: CampaignStatus
}

export interface ProductLine {
  /** สำหรับ React key ในฟอร์ม — ไม่บันทึกลง DB */
  id?: string
  sku: string | null
  spend: number | null
  orders: number | null
  gmv: number | null
}

export interface AdsCampaignContext {
  campaign: Campaign
  customerBrand: string
  /** จาก onboarding_forms.daily_ad_budget (บรีฟลูกค้า) */
  briefDailyBudget: number | null
}

export interface DailyMetric {
  id: string
  campaign_id: string
  report_date: string
  spend: number
  gmv: number
  orders: number
  roi: number | null
  cpa: number | null
  product_lines: ProductLine[]
  top_product: string | null
  top_video: string | null
  issue: string | null
  next_plan: string | null
  report_submitted: boolean
  /** เวลาที่ส่งรายงานจริง */
  reported_at: string | null
}

export interface DailyMetricInput {
  campaign_id: string
  report_date: string
  spend: number
  gmv: number
  orders: number
  roi: number | null
  cpa: number | null
  product_lines: ProductLine[]
  top_product: string | null
  top_video: string | null
  issue: string | null
  next_plan: string | null
  created_by: string
}

export interface CatalogProduct {
  id: string
  product_name: string
  sku: string | null
  product_link: string | null
}
