import { resolveLeadLinePushRecipient } from '../../../shared/line/resolveLeadLinePushRecipient'
import type { LeadLineIds } from '../../../shared/line/lineUserIdResolution'
import {
  deliverLineMessageToCustomer,
  type LineDeliveryMode,
} from '../../../shared/line/staffLineMessaging'
import type { Quotation } from './types'

export type PaymentLineSendResult =
  | { ok: true; mode: LineDeliveryMode }
  | { ok: false; error: string }

export async function sendPaymentInstructionsViaLine(opts: {
  quotation: Quotation
  brandName: string
  message: string
  lineIds: LeadLineIds | null
}): Promise<PaymentLineSendResult> {
  const leadId = opts.quotation.lead_id
  if (!leadId) {
    return { ok: false, error: 'ใบเสนอราคาไม่ผูก Lead — ไม่สามารถส่งทาง LINE ได้' }
  }

  const pushTo = await resolveLeadLinePushRecipient({
    id: leadId,
    line_user_id: opts.lineIds?.line_user_id,
    line_oa_chat_user_id: opts.lineIds?.line_oa_chat_user_id,
  })
  if (!pushTo) {
    return {
      ok: false,
      error: 'ยังไม่มี LINE สำหรับ Push — บันทึก ID แชท OA ในหน้า Lead',
    }
  }

  try {
    const result = await deliverLineMessageToCustomer(opts.lineIds, opts.message.trim(), {
      leadId,
      metadata: {
        quotation_id: opts.quotation.id,
        quotation_number: opts.quotation.quotation_number,
        source: 'payment_instructions',
      },
    })
    return { ok: true, mode: result.mode }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'ส่งข้อมูลชำระเงินไม่สำเร็จ',
    }
  }
}
