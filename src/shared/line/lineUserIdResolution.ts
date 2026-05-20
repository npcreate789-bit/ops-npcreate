import {
  isDocumentedLineChatBizAccountExampleId,
  isLegacyDocLineChatUserExampleId,
  legacyDocLineChatUserWarning,
} from './lineDocumentedExampleIds'
import {
  isLineMessagingUserIdForUrl,
  parseLineChatBizAccountFromUrl,
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
  if (isDocumentedLineChatBizAccountExampleId(parsedUserId)) {
    return (
      'นี่เป็น account id ตัวอย่างในเอกสาร (segment แรกของ URL) ไม่ใช่ user id ลูกค้า — ' +
      'ใช้ส่วนหลัง /chat/ ในลิงก์แชทลูกค้า'
    )
  }
  if (
    configuredAccountId &&
    parsedUserId.toLowerCase() === configuredAccountId.toLowerCase()
  ) {
    return (
      'ค่านี้เป็น user id ลูกค้า ไม่ใช่ account id ของ OA — วางลิงก์เต็ม chat.line.biz/…/chat/U… ' +
      'หรือตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID เป็น segment แรกของ URL (ไม่ใช่หลัง /chat/)'
    )
  }
  return null
}

/** ไม่บล็อก — แจ้งเมื่อ account ใน URL เต็มไม่ตรง env */
export function lineOaChatUserIdSaveWarning(
  input: string,
  configuredAccountId: string,
  parsedUserId: string,
): string | null {
  if (isLegacyDocLineChatUserExampleId(parsedUserId)) {
    return legacyDocLineChatUserWarning()
  }
  const accountFromUrl = parseLineChatBizAccountFromUrl(input)
  if (!accountFromUrl) return null
  if (accountFromUrl.toLowerCase() === parsedUserId.toLowerCase()) {
    return (
      'ลิงก์ไม่มี account ของ OA — ต้องเป็นรูปแบบ chat.line.biz/{account}/chat/{user} ' +
      'ไม่ใช่เฉพาะ user id ลูกค้า'
    )
  }
  if (
    !configuredAccountId ||
    accountFromUrl.toLowerCase() === configuredAccountId.toLowerCase()
  ) {
    return null
  }
  return (
    `account OA ในลิงก์ (${truncateLineId(accountFromUrl)}) ไม่ตรง VITE_LINE_CHAT_BIZ_ACCOUNT_ID บนระบบ (${truncateLineId(configuredAccountId)}) — ` +
    `บันทึก user id ลูกค้าแล้ว เปิดแชทในเบราว์เซอร์นี้ใช้ account จากลิงก์ — ` +
    `ตั้งบน Vercel: VITE_LINE_CHAT_BIZ_ACCOUNT_ID=${accountFromUrl} (segment แรกหลัง chat.line.biz/ ไม่ใช่หลัง /chat/)`
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

/** account id จาก URL chat.line.biz เต็มเท่านั้น */
export function parseLineChatBizAccountIdFromInput(input: string): string | null {
  return parseLineChatBizAccountFromUrl(input)
}

export interface LeadLineIds {
  line_user_id?: string | null
  line_oa_chat_user_id?: string | null
}

/**
 * อัปเดต line_oa_chat_user_id จาก webhook เฉพาะเมื่อปลอดภัย —
 * ไม่ทับ ID ที่ทีมบันทึกจาก URL แชท OA แล้ว (ต่างจาก LINE Login id)
 */
export function shouldSyncLineOaChatUserIdFromWebhook(
  existingOa: string | null | undefined,
  existingLogin: string | null | undefined,
  incomingUserId: string,
): boolean {
  const oa = existingOa?.trim() ?? ''
  const login = existingLogin?.trim() ?? ''
  const incoming = incomingUserId.trim()
  if (!incoming) return false
  if (!oa) return true
  if (isLegacyDocLineChatUserExampleId(oa)) return true
  if (oa.toLowerCase() === incoming.toLowerCase()) return true
  if (
    login &&
    oa.toLowerCase() === login.toLowerCase() &&
    incoming.toLowerCase() !== login.toLowerCase()
  ) {
    return true
  }
  return false
}

function lineIdsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** ID สำหรับ push Messaging API — ใช้แชท OA ก่อน แล้วค่อย LINE Login (ไม่ใช้ Login เมื่อมี OA คนละค่า) */
export function resolveLineMessagingRecipientId(ids: LeadLineIds): string | null {
  const login = ids.line_user_id?.trim() ?? ''
  const oa = ids.line_oa_chat_user_id?.trim() ?? ''
  const mismatch = lineLoginAndOaIdsMismatch(ids)

  if (oa && isLineMessagingUserId(oa)) {
    if (!mismatch || !login || !lineIdsEqual(oa, login)) return oa
  }

  if (!mismatch && login && isLineMessagingUserId(login)) return login
  return null
}

/** ID สำหรับเปิดแชทตรงบน chat.line.biz — ต้องเป็น user id จากแชท OA เท่านั้น (ไม่ใช่ตัวอย่าง) */
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
      return 'มีทั้ง LINE Login และแชท OA — ส่ง Push ใช้ ID จากประวัติแชท OA ไม่ใช่ LINE Login'
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
