export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'

export type CustomerStatus = 'pending' | 'active' | 'at_risk' | 'ended'

export interface Package {
  id: string
  code: string
  name: string
  description: string | null
  base_price: number
  is_active: boolean
}

export interface PackageInput {
  code: string
  name: string
  description: string | null
  base_price: number
  is_active: boolean
}

export interface PackageListOptions {
  /** undefined = ทั้งหมด, true = เฉพาะใช้งาน, false = ปิดใช้งาน */
  activeOnly?: boolean
}

export interface Customer {
  id: string
  lead_id: string | null
  brand_name: string
  contact_name: string | null
  phone: string | null
  line_id: string | null
  business_type: string | null
  package_name: string | null
  contract_start: string | null
  contract_end: string | null
  status: CustomerStatus
  account_owner_id: string | null
  ads_owner_id: string | null
  sales_owner_id: string
  created_at: string
  updated_at: string
}

export interface QuotationItem {
  id: string
  quotation_id: string
  package_id: string | null
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export interface Quotation {
  id: string
  quotation_number: string
  lead_id: string | null
  customer_id: string | null
  owner_id: string
  status: QuotationStatus
  subtotal: number
  discount: number
  vat_rate: number
  vat_amount: number
  total: number
  contract_months: number | null
  terms: string | null
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  payment_instructions_sent_at?: string | null
  payment_instructions_sent_by?: string | null
  paid_at: string | null
  public_token: string | null
  created_at: string
  updated_at: string
  items?: QuotationItem[]
  lead_brand_name?: string | null
}

export interface QuotationItemInput {
  package_id: string | null
  description: string
  quantity: number
  unit_price: number
  sort_order: number
}

export interface PublicQuotationItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export interface PublicQuotation {
  id: string
  quotation_number: string
  status: QuotationStatus
  subtotal: number
  discount: number
  vat_rate: number
  vat_amount: number
  total: number
  contract_months: number | null
  terms: string | null
  notes: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  paid_at: string | null
  created_at: string
  brand_name: string | null
  items: PublicQuotationItem[]
  can_accept: boolean
  can_upload_slip?: boolean
  slip_submitted?: boolean
}

export interface QuotationInput {
  lead_id: string | null
  owner_id: string
  status: QuotationStatus
  discount: number
  vat_rate: number
  contract_months: number | null
  terms: string | null
  notes: string | null
  items: QuotationItemInput[]
}
