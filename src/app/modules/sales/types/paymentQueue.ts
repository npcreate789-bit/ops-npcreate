import type { QuotationStatus } from '../types'

export interface QuotationPaymentQueueItem {
  id: string
  quotation_number: string
  lead_id: string | null
  owner_id: string
  status: QuotationStatus
  total: number
  accepted_at: string | null
  contract_months: number | null
  lead_brand_name: string | null
  is_sla_overdue?: boolean
  sla_hours?: number
}
