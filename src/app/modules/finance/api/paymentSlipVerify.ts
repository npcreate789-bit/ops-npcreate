import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export interface VerifyPaymentSlipResult {
  ok?: boolean
  skipped?: boolean
  ocr?: Record<string, unknown>
  apply?: {
    decision?: string
    auto_pass?: boolean
    reasons?: string[]
  }
  error?: string
}

/** เรียก Edge OCR + กฎ auto-confirm (ไม่ throw ถ้า offline/mock) */
export async function invokeVerifyPaymentSlip(
  paymentId: string,
  options?: { force?: boolean; publicToken?: string },
): Promise<VerifyPaymentSlipResult | null> {
  if (!paymentId.trim() || !isSupabaseConfigured || !supabase) {
    return null
  }

  const { data, error } = await supabase.functions.invoke('verify-payment-slip', {
    body: {
      payment_id: paymentId,
      force: options?.force === true,
      public_token: options?.publicToken?.trim() || undefined,
    },
  })

  if (error) {
    console.warn('verify-payment-slip', error.message)
    return { error: error.message }
  }

  return (data ?? null) as VerifyPaymentSlipResult | null
}
