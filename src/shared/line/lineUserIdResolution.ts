import {
  isLineMessagingUserIdForUrl,
  parseLineChatBizUrl,
} from './lineChatBizUrl'
import { isLineMessagingUserId } from './lineStaffOpenUrl'

function truncateLineId(id: string, head = 10, tail = 6): string {
  const t = id.trim()
  if (t.length <= head + tail + 1) return t
  return `${t.slice(0, head)}…${t.slice(-tail)}`
}

/** บล็อกการบันทึก — รูปแบบผิดจริงๆ */
export function lineOaChatUserIdSaveError(
  parsedUserId: string,
  configuredAccountId: string,
): string | null {
  if (
    configuredAccountId &&
    parsedUserId.toLowerCase() === configuredAccountId.toLowerCase()
  ) {
    return 'ค่านี้เป็น account id ของ OA ไม่ใช่ user id ของลูกค้า — ใช้ส่วนหลัง /chat/ ใน URL'
  }
  return null
}

/** ไม่บล็อก — แจ้งเมื่อ account ในลิงก์ไม่ตรง env (มักตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID ผิด) */
export function lineOaChatUserIdSaveWarning(
  input: string,
  configuredAccountId: string,
): string | null {
  const accountFromInput = parseLineChatBizAccountIdFromInput(input)
  if (!accountFromInput) return null
  if (
    !configuredAccountId ||
    accountFromInput.toLowerCase() === configuredAccountId.toLowerCase()
  ) {
    return null
  }
  return (
    `account ในลิงก์ (${truncateLineId(accountFromInput)}) ไม่ตรงค่าในระบบ (${truncateLineId(configuredAccountId)}) — ` +
    `บันทึก user id แล้วและใช้ account จากลิงก์เปิดแชทในเบราว์เซอร์นี้ — ` +
    `แนะนำตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID=${accountFromInput} บน Vercel`
  )
}

/** ดึง LINE Messaging user id จาก URL chat.line.biz / manager.line.biz หรือข้อความที่วาง */
export function parseLineOaChatUserIdFromInput(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const parsed = parseLineChatBizUrl(raw)
  if (parsed?.chatUserId && isLineMessagingUserIdForUrl(parsed.chatUserId)) {
    return parsed.chatUserId
  }

  // ลิงก์มี /chat/ แต่ไม่มี user id — อย่าเดาว่า segment แรกคือลูกค้า (มักเป็น account id)
  if (
    parsed &&
    (raw.includes('chat.line.biz') || raw.includes('manager.line.biz')) &&
    raw.includes('/chat') &&
    !parsed.chatUserId
  ) {
    return null
  }

  const chatPathMatch = raw.match(/\/chat\/(U[0-9a-f]{32})\b/i)
  if (chatPathMatch?.[1] && isLineMessagingUserIdForUrl(chatPathMatch[1])) {
    return chatPathMatch[1]
  }

  // ID เปล่า (ไม่ใช่ URL ที่มี account + user ปนกัน)
  if (isLineMessagingUserIdForUrl(raw) && !raw.includes('line.biz')) {
    return raw
  }

  if (!raw.includes('line.biz')) {
    const tokenMatch = raw.match(/\b(U[0-9a-f]{32})\b/i)
    if (tokenMatch?.[1] && isLineMessagingUserIdForUrl(tokenMatch[1])) {
      return tokenMatch[1]
    }
  }

  return null
}

/** account id จาก URL chat.line.biz (segment แรกหลังโดเมน) */
export function parseLineChatBizAccountIdFromInput(input: string): string | null {
  return parseLineChatBizUrl(input)?.accountId ?? null
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
