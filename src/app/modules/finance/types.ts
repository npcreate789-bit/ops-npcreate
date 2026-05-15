export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface Payment {
  id: string
  customer_id: string
  quotation_id: string | null
  recorded_by: string
  service_type: string
  amount: number
  vat_amount: number
  total_amount: number
  status: PaymentStatus
  payment_date: string | null
  due_date: string | null
  slip_path: string | null
  receipt_number: string | null
  tax_invoice_number: string | null
  notes: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
  customer_brand_name?: string | null
}

export interface PaymentInput {
  customer_id: string
  quotation_id: string | null
  recorded_by: string
  service_type: string
  amount: number
  vat_amount: number
  total_amount: number
  status: PaymentStatus
  payment_date: string | null
  due_date: string | null
  notes: string | null
  issue_receipt: boolean
  issue_tax_invoice: boolean
}

export interface FinanceSummary {
  revenue_this_month: number
  pending_total: number
  overdue_count: number
  paid_count_this_month: number
}

export interface CustomerOption {
  id: string
  brand_name: string
  quotation_id?: string | null
  quotation_total?: number | null
}
