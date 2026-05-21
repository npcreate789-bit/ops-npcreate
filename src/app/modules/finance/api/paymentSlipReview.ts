import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { PaymentSlipReviewItem, PaymentSlipVerifyingItem } from '../types/paymentSlipQueue'

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

function parseVerifying(data: unknown): PaymentSlipVerifyingItem[] {
  if (!Array.isArray(data)) return []
  return data as PaymentSlipVerifyingItem[]
}

export async function listPaymentsVerifyingSlip(): Promise<PaymentSlipVerifyingItem[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase.rpc('list_payments_verifying_slip')
  if (error) throw new Error(error.message)
  return parseVerifying(data)
}
