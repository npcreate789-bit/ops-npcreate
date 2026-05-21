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
}
