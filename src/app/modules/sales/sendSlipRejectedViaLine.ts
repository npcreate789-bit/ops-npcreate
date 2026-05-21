import { resolveLeadLinePushRecipient } from '../../../shared/line/resolveLeadLinePushRecipient'
import type { LeadLineIds } from '../../../shared/line/lineUserIdResolution'
import {
  deliverLineMessageToCustomer,
  type LineDeliveryMode,
} from '../../../shared/line/staffLineMessaging'
import { shouldSendPaymentLineNotify } from '../../../shared/payment/paymentLineNotifyPolicy'

export type SlipRejectedLineResult =
  | { ok: true; mode: LineDeliveryMode }
  | { ok: false; error: string }

export function buildSlipRejectedMessage(input: {
  brandName: string
  quotationNumber: string | null
  publicUrl: string | null
  note?: string | null
}): string {
  const lines = [
    `สวัสดีครับ/ค่ะ — ทีม NP Create`,
    '',
    `สลิปชำระเงินสำหรับ ${input.brandName}`,
    input.quotationNumber ? `(${input.quotationNumber})` : '',
    'ยังไม่ผ่านการตรวจสอบ',
  ].filter(Boolean)

  if (input.note?.trim()) {
    lines.push('', `หมายเหตุ: ${input.note.trim()}`)
  }

  if (input.publicUrl) {
    lines.push('', 'กรุณาอัปโหลดสลิปใหม่ที่ลิงก์ใบเสนอราคา:', input.publicUrl)
  } else {
    lines.push('', 'กรุณาส่งสลิปใหม่ทางแชทนี้')
  }

  return lines.join('\n')
}

export async function sendSlipRejectedViaLine(opts: {
  leadId: string
  brandName: string
  quotationNumber: string | null
  publicUrl: string | null
  note?: string | null
  paymentId: string
  lineIds: LeadLineIds | null
}): Promise<SlipRejectedLineResult> {
  const enabled = await shouldSendPaymentLineNotify('slip_rejected')
  if (!enabled) {
    return { ok: false, error: 'ปิดการแจ้ง LINE ใน Settings — ข้ามการส่ง' }
  }

  const message = buildSlipRejectedMessage({
    brandName: opts.brandName,
    quotationNumber: opts.quotationNumber,
    publicUrl: opts.publicUrl,
    note: opts.note,
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
        source: 'slip_rejected',
      },
    })
    return { ok: true, mode: result.mode }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'ส่งแจ้งสลิปไม่ผ่านไม่สำเร็จ',
    }
  }
}
