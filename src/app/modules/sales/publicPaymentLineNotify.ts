import { invokeNotifyPaymentCustomerLine } from '../finance/api/notifyPaymentCustomerLine'
import type { PublicQuotation } from './types'

/**
 * ส่ง review_pending จากฝั่งลูกค้าเมื่อ:
 * - timeout (decision = timeout หรือไม่มี decision)
 * - OCR ตั้ง review_required แต่ Edge LINE อาจล้ม (server dedupe กันซ้ำ)
 */
export function shouldClientSendReviewPending(data: PublicQuotation): boolean {
  if (data.status !== 'awaiting_payment') return false
  if (data.payment_verification_status !== 'review_required') return false
  if (!data.slip_submitted) return false
  if (!data.pending_payment_id?.trim()) return false

  const decision = data.payment_verification_decision?.trim()
  if (decision === 'auto_pass') return false
  return true
}

export async function tryNotifyReviewPendingFromPublic(
  publicToken: string,
  data: PublicQuotation,
  sentInSession?: Set<string>,
): Promise<void> {
  if (!shouldClientSendReviewPending(data)) return

  const payId = data.pending_payment_id!.trim()
  if (sentInSession?.has(payId)) return

  sentInSession?.add(payId)
  await invokeNotifyPaymentCustomerLine(payId, 'review_pending', {
    publicToken,
  })
}
