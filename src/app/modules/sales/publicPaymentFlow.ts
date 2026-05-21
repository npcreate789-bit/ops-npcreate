import type { PublicQuotation } from './types'

export type PublicPaymentVerificationStatus =
  | 'none'
  | 'verifying'
  | 'review_required'
  | 'confirmed'

export type PublicStepState = 'done' | 'current' | 'pending'

export interface PublicQuotationProgressStep {
  id: string
  label: string
  state: PublicStepState
}

export function shouldPollPublicQuotation(data: PublicQuotation | null): boolean {
  if (!data) return false
  if (data.status === 'accepted') return true
  if (data.status !== 'awaiting_payment') return false
  const v = data.payment_verification_status ?? 'none'
  return v === 'verifying' || v === 'review_required' || v === 'none'
}

export function publicQuotationPollIntervalMs(data: PublicQuotation | null): number {
  if (data?.payment_verification_status === 'verifying') return 8_000
  if (data?.status === 'accepted') return 60_000
  if (data?.payment_verification_status === 'review_required') return 30_000
  return 12_000
}

export function buildPublicQuotationProgressSteps(
  data: PublicQuotation,
): PublicQuotationProgressStep[] {
  const v = (data.payment_verification_status ?? 'none') as PublicPaymentVerificationStatus
  const paid = data.status === 'paid' || v === 'confirmed'
  const awaitingPay = data.status === 'awaiting_payment'
  const accepted = data.status === 'accepted'
  const slipIn = data.slip_submitted || v !== 'none'

  const step = (id: string, label: string, state: PublicStepState) => ({ id, label, state })

  if (paid) {
    return [
      step('accept', 'ยอมรับใบเสนอราคา', 'done'),
      step('pay', 'ชำระเงิน', 'done'),
      step('slip', 'ส่งสลิป', 'done'),
      step('verify', 'ตรวจสอบ', 'done'),
      step('done', 'ยืนยันแล้ว', 'done'),
    ]
  }

  if (awaitingPay) {
    if (v === 'verifying') {
      return [
        step('accept', 'ยอมรับใบเสนอราคา', 'done'),
        step('pay', 'ชำระเงิน', 'done'),
        step('slip', 'ส่งสลิป', 'done'),
        step('verify', 'ตรวจสอบอัตโนมัติ', 'current'),
        step('done', 'ยืนยันการชำระ', 'pending'),
      ]
    }
    if (v === 'review_required' || slipIn) {
      return [
        step('accept', 'ยอมรับใบเสนอราคา', 'done'),
        step('pay', 'ชำระเงิน', 'done'),
        step('slip', 'ส่งสลิป', 'done'),
        step('verify', 'ตรวจสอบอัตโนมัติ', 'done'),
        step('done', 'รอทีมยืนยัน', 'current'),
      ]
    }
    return [
      step('accept', 'ยอมรับใบเสนอราคา', 'done'),
      step('pay', 'ชำระเงิน', 'current'),
      step('slip', 'ส่งสลิป', 'pending'),
      step('verify', 'ตรวจสอบ', 'pending'),
      step('done', 'ยืนยันการชำระ', 'pending'),
    ]
  }

  if (accepted) {
    return [
      step('accept', 'ยอมรับใบเสนอราคา', 'done'),
      step('pay', 'รอเลขบัญชี', 'current'),
      step('slip', 'ส่งสลิป', 'pending'),
      step('verify', 'ตรวจสอบ', 'pending'),
      step('done', 'ยืนยันการชำระ', 'pending'),
    ]
  }

  return [
    step('accept', 'ยอมรับใบเสนอราคา', 'current'),
    step('pay', 'ชำระเงิน', 'pending'),
    step('slip', 'ส่งสลิป', 'pending'),
    step('verify', 'ตรวจสอบ', 'pending'),
    step('done', 'ยืนยันการชำระ', 'pending'),
  ]
}

export function showPublicProgressStepper(data: PublicQuotation): boolean {
  return (
    data.status === 'sent' ||
    data.status === 'viewed' ||
    data.status === 'accepted' ||
    data.status === 'awaiting_payment' ||
    data.status === 'paid'
  )
}
