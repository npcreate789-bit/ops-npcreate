import {
  canCreateSalesQuotation,
  canEditSalesQuotation,
  canSendLinePushAsStaff,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { resolveLeadLinePushRecipient } from '../../../shared/line/resolveLeadLinePushRecipient'
import type { LeadLineIds } from '../../../shared/line/lineUserIdResolution'
import {
  lineLoginAndOaIdsMismatch,
  resolveLineMessagingRecipientId,
} from '../../../shared/line/lineUserIdResolution'
import type { QuotationInput } from './types'

export type QuotationLineSendPreflightResult =
  | { ok: true }
  | { ok: false; error: string }

/** ตรวจสิทธิ์และเงื่อนไขก่อนบันทึก+ส่ง LINE — เรียกทันทีเมื่อกดปุ่ม */
export async function validateQuotationLineSendPreflight(opts: {
  roles: AppRole[]
  configured: boolean
  isNew: boolean
  quotationOwnerId?: string
  userId: string
  input: QuotationInput
  lineIds: LeadLineIds | null
}): Promise<QuotationLineSendPreflightResult> {
  if (opts.configured) {
    const canSave = opts.isNew
      ? canCreateSalesQuotation(opts.roles)
      : canEditSalesQuotation(opts.roles, opts.quotationOwnerId, opts.userId)
    if (!canSave) {
      return { ok: false, error: 'ไม่มีสิทธิ์บันทึกหรือส่งใบเสนอราคานี้' }
    }
    if (!canSendLinePushAsStaff(opts.roles)) {
      return {
        ok: false,
        error:
          'บทบาทของคุณไม่มีสิทธิ์ส่งข้อความ LINE ให้ลูกค้า — ติดต่อทีม Sales / Operations',
      }
    }
  }

  const leadId = opts.input.lead_id?.trim()
  if (!leadId) {
    return { ok: false, error: 'ผูก Lead ก่อนจึงจะส่งลิงก์ใบเสนอราคาทาง LINE ได้' }
  }

  const items = opts.input.items?.filter((i) => i.description?.trim()) ?? []
  if (items.length === 0) {
    return { ok: false, error: 'เพิ่มรายการในใบเสนอราคาก่อนส่ง' }
  }

  const pushTo = await resolveLeadLinePushRecipient({
    id: leadId,
    line_user_id: opts.lineIds?.line_user_id,
    line_oa_chat_user_id: opts.lineIds?.line_oa_chat_user_id,
  })
  if (!pushTo) {
    const mismatch = opts.lineIds && lineLoginAndOaIdsMismatch(opts.lineIds)
    return {
      ok: false,
      error: mismatch
        ? 'LINE Login ID กับแชท OA ไม่ตรงกัน — บันทึก ID จาก URL แชท OA ในหน้า Lead แล้วให้ลูกค้าทัก OA'
        : 'ยังไม่มี LINE User ID สำหรับ Push — บันทึก ID จาก URL แชท OA (chat.line.biz/…/chat/U…) ในหน้า Lead',
    }
  }

  const oaId = opts.lineIds?.line_oa_chat_user_id?.trim()
  if (
    opts.lineIds &&
    lineLoginAndOaIdsMismatch(opts.lineIds) &&
    !oaId &&
    pushTo.toLowerCase() === opts.lineIds.line_user_id?.trim().toLowerCase()
  ) {
    return {
      ok: false,
      error:
        'ยังใช้เฉพาะ LINE Login ID — บันทึก ID แชท OA จาก URL ในหน้า Lead ก่อนส่งจากใบเสนอราคา',
    }
  }

  if (!resolveLineMessagingRecipientId(opts.lineIds ?? {})) {
    return {
      ok: false,
      error:
        'ยังไม่มี LINE User ID สำหรับ Push — บันทึก ID จาก URL แชท OA (chat.line.biz/…/chat/U…) ในหน้า Lead',
    }
  }

  return { ok: true }
}
