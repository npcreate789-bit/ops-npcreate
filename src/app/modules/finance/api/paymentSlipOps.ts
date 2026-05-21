import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export interface RejectPaymentSlipResult {
  payment_id: string
  quotation_id: string | null
  public_token: string | null
  lead_id: string | null
}

export async function rejectPaymentCustomerSlip(
  paymentId: string,
  note?: string,
): Promise<RejectPaymentSlipResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      payment_id: paymentId,
      quotation_id: null,
      public_token: null,
      lead_id: null,
    }
  }

  const { data, error } = await supabase.rpc('reject_payment_customer_slip', {
    p_payment_id: paymentId,
    p_note: note?.trim() || null,
  })
  if (error) throw new Error(error.message)

  const row = data as Record<string, unknown> | null
  if (!row?.ok) throw new Error('ปฏิเสธสลิปไม่สำเร็จ')

  return {
    payment_id: String(row.payment_id),
    quotation_id: (row.quotation_id as string) ?? null,
    public_token: (row.public_token as string) ?? null,
    lead_id: (row.lead_id as string) ?? null,
  }
}
