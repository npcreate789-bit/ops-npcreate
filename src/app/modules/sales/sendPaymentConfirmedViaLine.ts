import { resolveLeadLinePushRecipient } from '../../../shared/line/resolveLeadLinePushRecipient'
import type { LeadLineIds } from '../../../shared/line/lineUserIdResolution'
import {
  deliverLineMessageToCustomer,
  type LineDeliveryMode,
} from '../../../shared/line/staffLineMessaging'
import { formatThaiBaht } from '../../../shared/payment/buildPaymentInstructionsMessage'
import { shouldSendPaymentLineNotify } from '../../../shared/payment/paymentLineNotifyPolicy'

export type PaymentConfirmedLineResult =
  | { ok: true; mode: LineDeliveryMode }
  | { ok: false; error: string }

export function buildPaymentConfirmedMessage(input: {
  brandName: string
  quotationNumber: string | null
  total: number
}): string {
  const ref = input.quotationNumber ? ` (${input.quotationNumber})` : ''
  return [
    `สวัสดีครับ/ค่ะ — ทีม NP Create`,
    '',
    `ยืนยันรับชำระเงิน${ref} สำหรับ ${input.brandName} แล้ว`,
    `ยอด ${formatThaiBaht(input.total)}`,
    '',
    'ขั้นถัดไป: ทีมจะติดต่อเรื่องรับบรีฟและเริ่มงานตามแพ็กเกจ',
    'หากมีคำถาม ตอบกลับทางแชทนี้ได้เลยครับ/ค่ะ',
  ].join('\n')
}

export async function sendPaymentConfirmedViaLine(opts: {
  leadId: string
  brandName: string
  quotationNumber: string | null
  total: number
  paymentId: string
  lineIds: LeadLineIds | null
}): Promise<PaymentConfirmedLineResult> {
  const enabled = await shouldSendPaymentLineNotify('payment_confirmed')
  if (!enabled) {
    return { ok: false, error: 'ปิดการแจ้ง LINE ใน Settings — ข้ามการส่ง' }
  }

  const message = buildPaymentConfirmedMessage({
    brandName: opts.brandName,
    quotationNumber: opts.quotationNumber,
    total: opts.total,
  })

  const pushTo = await resolveLeadLinePushRecipient({
    id: opts.leadId,
    line_user_id: opts.lineIds?.line_user_id,
    line_oa_chat_user_id: opts.lineIds?.line_oa_chat_user_id,
  })
  if (!pushTo) {
    return {
      ok: false,
      error: 'ยังไม่มี LINE สำหรับ Push — แจ้งลูกค้าด้วยช่องทางอื่น',
    }
  }

  try {
    const result = await deliverLineMessageToCustomer(opts.lineIds, message, {
      leadId: opts.leadId,
      metadata: {
        payment_id: opts.paymentId,
        source: 'payment_confirmed',
      },
    })
    return { ok: true, mode: result.mode }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'ส่งแจ้งยืนยันชำระไม่สำเร็จ',
    }
  }
}
