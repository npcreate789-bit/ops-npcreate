export type ChecklistValue = 'pending' | 'done' | 'yes' | 'no' | 'ready' | 'needs_fix'

export interface OnboardingForm {
  id: string
  customer_id: string
  tiktok_shop_url: string | null
  product_links: string | null
  pricing_info: string | null
  promotion_info: string | null
  profit_margin: string | null
  commission_info: string | null
  target_roi: number | null
  daily_ad_budget: number | null
  existing_content: string | null
  ads_account_info: string | null
  seller_account_info: string | null
  business_center_info: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  customer_id: string
  item_key: string
  status: ChecklistValue
  note: string | null
  updated_at: string
}

export interface OnboardingCustomer {
  id: string
  brand_name: string
  status: string
  ready_for_ads: boolean
  account_owner_id: string | null
  ads_owner_id: string | null
  contract_end: string | null
  progress: number
  has_form: boolean
}

export interface OnboardingDetail {
  customer: OnboardingCustomer
  form: OnboardingForm | null
  checklist: ChecklistItem[]
}

export type OnboardingFormInput = Omit<
  OnboardingForm,
  'id' | 'customer_id' | 'created_at' | 'updated_at'
>
