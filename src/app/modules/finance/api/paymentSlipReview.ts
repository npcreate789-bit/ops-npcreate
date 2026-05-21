import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { PaymentSlipReviewItem } from '../types/paymentSlipQueue'

function parseQueue(data: unknown): PaymentSlipReviewItem[] {
  if (!Array.isArray(data)) return []
  return data as PaymentSlipReviewItem[]
}

export async function listPaymentsPendingSlipReview(): Promise<PaymentSlipReviewItem[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase.rpc('list_payments_pending_slip_review')
  if (error) throw new Error(error.message)
  return parseQueue(data)
}
