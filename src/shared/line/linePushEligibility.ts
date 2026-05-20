import { LINE_CHAT_BIZ_ACCOUNT_ID, isLineMessagingUserId } from './lineStaffOpenUrl'
import {
  type LeadLineIds,
  resolveLineMessagingRecipientId,
} from './lineUserIdResolution'

/** user id ที่ส่ง LINE Push ได้ (ไม่ใช่ตัวอย่างหรือ account id ของ OA) */
export function isUsableLinePushUserId(id: string | null | undefined): boolean {
  const t = id?.trim()
  if (!t || !isLineMessagingUserId(t)) return false
  const accountId = LINE_CHAT_BIZ_ACCOUNT_ID.trim()
  if (accountId && t.toLowerCase() === accountId.toLowerCase()) return false
  return true
}

/** แผงแชทเปิดให้ส่งได้เมื่อมี ID ในฟอร์ม หรือมีข้อความเข้าจาก webhook */
export function leadHasLinePushCapability(
  lineIds: LeadLineIds,
  latestInboundLineUserId?: string | null,
): boolean {
  if (isUsableLinePushUserId(latestInboundLineUserId)) return true
  const fromForm = resolveLineMessagingRecipientId(lineIds)
  return Boolean(fromForm && isUsableLinePushUserId(fromForm))
}
