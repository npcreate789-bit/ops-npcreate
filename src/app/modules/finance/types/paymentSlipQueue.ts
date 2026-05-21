export interface PaymentSlipReviewItem {
  id: string
  customer_id: string
  quotation_id: string | null
  total_amount: number
  slip_path: string | null
  customer_slip_uploaded_at: string | null
  created_at: string
  customer_brand_name: string | null
  quotation_number: string | null
  verification_status?: string | null
  slip_detected_amount?: number | null
  verification_confidence?: number | null
  verification_decision?: string | null
  verification_result?: Record<string, unknown> | null
  quotation_total?: number | null
}

export interface PaymentSlipVerifyingItem {
  id: string
  customer_id: string
  quotation_id: string | null
  total_amount: number
  verification_started_at: string | null
  customer_brand_name: string | null
  quotation_number: string | null
}
