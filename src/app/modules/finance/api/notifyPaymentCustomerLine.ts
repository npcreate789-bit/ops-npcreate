import type { PaymentLineNotifyEvent } from '../../../../shared/payment/paymentLineNotifyPolicy'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { PaymentLineNotifyResult } from './paymentLineFeedback'

export async function invokeNotifyPaymentCustomerLine(
  paymentId: string,
  event: PaymentLineNotifyEvent,
  opts?: { rejectNote?: string | null; publicToken?: string },
): Promise<PaymentLineNotifyResult> {
  if (!paymentId.trim() || !isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'offline' }
  }

  const { data, error } = await supabase.functions.invoke('notify-payment-customer-line', {
    body: {
      payment_id: paymentId,
      event,
      reject_note: opts?.rejectNote ?? null,
      public_token: opts?.publicToken?.trim() || undefined,
    },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const body = (data ?? {}) as {
    ok?: boolean
    skipped?: string
    pushed?: boolean
    error?: string
  }

  if (body.error) {
    return { ok: false, error: body.error }
  }

  return {
    ok: body.ok !== false,
    skipped: typeof body.skipped === 'string' ? body.skipped : undefined,
    pushed: body.pushed === true,
  }
}
