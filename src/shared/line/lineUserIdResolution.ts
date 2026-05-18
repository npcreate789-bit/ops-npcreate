import { isLineMessagingUserId } from './lineStaffOpenUrl'

/** ดึง LINE Messaging user id จาก URL chat.line.biz หรือข้อความที่วาง */
export function parseLineOaChatUserIdFromInput(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const chatPathMatch = raw.match(/\/chat\/(U[0-9a-f]{32})\b/i)
  if (chatPathMatch?.[1] && isLineMessagingUserId(chatPathMatch[1])) {
    return chatPathMatch[1]
  }

  const tokenMatch = raw.match(/\b(U[0-9a-f]{32})\b/i)
  if (tokenMatch?.[1] && isLineMessagingUserId(tokenMatch[1])) {
    return tokenMatch[1]
  }

  return null
}

export interface LeadLineIds {
  line_user_id?: string | null
  line_oa_chat_user_id?: string | null
}

/** ID สำหรับ push Messaging API — ใช้แชท OA ก่อน แล้วค่อย LINE Login */
export function resolveLineMessagingRecipientId(ids: LeadLineIds): string | null {
  const oa = ids.line_oa_chat_user_id?.trim()
  if (oa && isLineMessagingUserId(oa)) return oa
  const login = ids.line_user_id?.trim()
  if (login && isLineMessagingUserId(login)) return login
  return null
}

/** ID สำหรับเปิดแชทตรงบน chat.line.biz — ต้องเป็น user id จากแชท OA เท่านั้น */
export function resolveLineStaffChatOpenUserId(ids: LeadLineIds): string | null {
  const oa = ids.line_oa_chat_user_id?.trim()
  if (oa && isLineMessagingUserId(oa)) return oa
  return null
}

export function lineLoginAndOaIdsMismatch(ids: LeadLineIds): boolean {
  const login = ids.line_user_id?.trim()
  const oa = ids.line_oa_chat_user_id?.trim()
  if (!login || !oa) return false
  if (!isLineMessagingUserId(login) || !isLineMessagingUserId(oa)) return false
  return login.toLowerCase() !== oa.toLowerCase()
}

export function lineStaffChatIdHint(ids: LeadLineIds): string {
  if (!ids.line_user_id?.trim() && !ids.line_oa_chat_user_id?.trim()) {
    return 'ยังไม่มี LINE User ID — ให้ลูกค้าเชื่อมต่อ LINE จากฟอร์มติดต่อหรือเพิ่มเพื่อน OA'
  }
  if (resolveLineStaffChatOpenUserId(ids)) {
    if (lineLoginAndOaIdsMismatch(ids)) {
      return 'มีทั้ง ID จาก LINE Login และแชท OA — เปิดแชทใช้ ID จากแชท OA'
    }
    return 'เปิดแชทตรงลูกค้าบน chat.line.biz ได้ (ID จากแชท OA)'
  }
  if (ids.line_user_id?.trim() && lineLoginAndOaIdsMismatch(ids)) {
    return 'ID จากการเชื่อมต่อ LINE ไม่ตรงกับแชท OA — วางลิงก์หรือ ID จาก URL แชทลูกค้าแล้วบันทึกด้านล่าง'
  }
  if (ids.line_user_id?.trim()) {
    return 'มีเฉพาะ LINE Login ID — เปิดรายการแชท OA แล้ววาง ID จาก URL แชทลูกค้า (หลัง /chat/) เพื่อเปิดแชทตรงได้'
  }
  return 'บันทึก LINE User ID จาก URL แชท OA (หลัง /chat/) เพื่อเปิดแชทตรง'
}
