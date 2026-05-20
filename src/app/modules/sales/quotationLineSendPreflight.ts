import {
  canCreateSalesQuotation,
  canEditSalesQuotation,
  canSendLinePushAsStaff,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { LeadLineIds } from '../../../shared/line/lineUserIdResolution'
import { resolveLineMessagingRecipientId } from '../../../shared/line/lineUserIdResolution'
import type { QuotationInput } from './types'

export type QuotationLineSendPreflightResult =
  | { ok: true }
  | { ok: false; error: string }

/** ตรวจสิทธิ์และเงื่อนไขก่อนบันทึก+ส่ง LINE — เรียกทันทีเมื่อกดปุ่ม */
export function validateQuotationLineSendPreflight(opts: {
  roles: AppRole[]
  configured: boolean
  isNew: boolean
  quotationOwnerId?: string
  userId: string
  input: QuotationInput
  lineIds: LeadLineIds | null
}): QuotationLineSendPreflightResult {
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
        error: 'บทบาทของคุณไม่มีสิทธิ์ส่งข้อความ LINE ให้ลูกค้า — ติดต่อทีม Sales / Operations',
      }
    }
  }

  if (!opts.input.lead_id?.trim()) {
    return { ok: false, error: 'ผูก Lead ก่อนจึงจะส่งลิงก์ใบเสนอราคาทาง LINE ได้' }
  }

  const items = opts.input.items?.filter((i) => i.description?.trim()) ?? []
  if (items.length === 0) {
    return { ok: false, error: 'เพิ่มรายการในใบเสนอราคาก่อนส่ง' }
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
