import { lineOaHandleForUrl } from '../contact/channelConnectConfig'
import { NPCREATE_LINE_OA_URL } from '../crm/preferredContactChannel'

function resolveViteEnv(value: string | undefined): string {
  if (value == null) return ''
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
  return trimmed
}

/** LINE Official Account id on chat.line.biz (first path segment when staff opens OA chats) */
export const LINE_CHAT_BIZ_ACCOUNT_ID = resolveViteEnv(
  import.meta.env.VITE_LINE_CHAT_BIZ_ACCOUNT_ID,
)

/** LINE Messaging API user id: U + 32 hex (see LINE Developers docs) */
const LINE_MESSAGING_USER_ID_RE = /^U[0-9a-f]{32}$/i

export function isLineMessagingUserId(id: string | null | undefined): id is string {
  const trimmed = id?.trim()
  return Boolean(trimmed && LINE_MESSAGING_USER_ID_RE.test(trimmed))
}

export function isValidLineUserId(id: string | null | undefined): id is string {
  return isLineMessagingUserId(id)
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

/** ลิงก์ line.me พร้อมข้อความล่วงหน้า (มือถือ / fallback) */
export function lineOaMessageUrlWithText(text: string): string {
  const base = `https://line.me/R/oaMessage/${lineOaHandleForUrl()}/`
  return `${base}?text=${encodeURIComponent(text.trim())}`
}

/** รายการแชท OA บน chat.line.biz (ไม่ระบุลูกค้า — ไม่ 404 จาก user id ผิดช่องทาง) */
export function staffLineOaInboxUrl(): string | null {
  if (!LINE_CHAT_BIZ_ACCOUNT_ID) return null
  return `https://chat.line.biz/${LINE_CHAT_BIZ_ACCOUNT_ID}/chat`
}

/** LINE Official Account Manager — แชท (ใช้ account id เดียวกับ chat.line.biz) */
export function staffLineManagerInboxUrl(): string | null {
  if (!LINE_CHAT_BIZ_ACCOUNT_ID) return null
  return `https://manager.line.biz/account/${LINE_CHAT_BIZ_ACCOUNT_ID}/chat`
}

/**
 * แชทตรงลูกค้าบน chat.line.biz — ใช้ได้เมื่อ userId เป็น Messaging API id ของลูกค้าที่เคยทัก OA แล้ว
 * ID จาก LINE Login (/contact OAuth) มักไม่ตรง → 404 หลังล็อกอิน แม้ URL รูปแบบถูกต้อง
 */
export function staffLineDirectUserChatUrl(lineUserId: string): string | null {
  const uid = lineUserId.trim()
  if (!isLineMessagingUserId(uid) || !LINE_CHAT_BIZ_ACCOUNT_ID) return null
  return `https://chat.line.biz/${LINE_CHAT_BIZ_ACCOUNT_ID}/chat/${uid}`
}

function staffDirectUserChatEnabled(options?: { directUserChat?: boolean }): boolean {
  if (options?.directUserChat != null) return options.directUserChat
  const flag = resolveViteEnv(import.meta.env.VITE_LINE_STAFF_DIRECT_USER_CHAT)
  return flag === '1' || flag.toLowerCase() === 'true'
}

export type StaffLineChatOpenMode = 'auto' | 'inbox' | 'direct'

/**
 * URL สำหรับทีมเปิดแชท LINE กับลูกค้า
 * - default (auto): เปิด inbox OA + คัดลอก user id (ถ้ามี) — หลีกเลี่ยง 404 จาก Login id
 * - direct: .../chat/{userId} — เปิดเมื่อยืนยันว่า id ตรงกับแชท OA แล้ว
 */
export function staffLineChatUrl(
  lineUserId?: string | null,
  options?: { text?: string; directUserChat?: boolean; mode?: StaffLineChatOpenMode },
): string {
  const uid = lineUserId?.trim()
  const mode = options?.mode ?? 'auto'
  const useDirect =
    mode === 'direct' ||
    (mode === 'auto' && staffDirectUserChatEnabled(options) && isLineMessagingUserId(uid))

  if (useDirect && uid) {
    const direct = staffLineDirectUserChatUrl(uid)
    if (direct) return direct
  }

  if (mode !== 'direct') {
    const inbox = staffLineOaInboxUrl()
    if (inbox) return inbox
  }

  const text = options?.text?.trim()
  if (text) return lineOaMessageUrlWithText(text)
  return NPCREATE_LINE_OA_URL
}

async function copyLineUserIdForStaffSearch(userId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(userId.trim())
    return true
  } catch {
    return false
  }
}

/** เปิดแชท — inbox เป็นค่าเริ่มต้น; คัดลอก LINE User ID ให้ค้นหาใน chat.line.biz เมื่อไม่ใช้ direct */
export async function openStaffLineChat(
  lineUserId?: string | null,
  options?: { text?: string; directUserChat?: boolean; mode?: StaffLineChatOpenMode },
): Promise<void> {
  const uid = lineUserId?.trim()
  const useDirect =
    options?.mode === 'direct' ||
    (options?.mode !== 'inbox' && staffDirectUserChatEnabled(options) && isLineMessagingUserId(uid))

  if (uid && !useDirect) {
    await copyLineUserIdForStaffSearch(uid)
  }

  const url = staffLineChatUrl(lineUserId, options)
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** เตือนเมื่อยังเปิดแชทตรงลูกค้าไม่ได้หรือใช้โหมด inbox */
export function staffLineDirectChatHint(lineUserId?: string | null): string | null {
  if (!lineUserId?.trim()) {
    return 'ยังไม่มี LINE User ID — ให้ลูกค้าเชื่อมต่อ LINE จากฟอร์มติดต่อหรือเพิ่มเพื่อน OA'
  }
  if (!isLineMessagingUserId(lineUserId)) {
    return 'LINE User ID ไม่ถูกรูปแบบ (U ตามด้วยตัวเลข a-f 32 ตัว)'
  }
  if (!LINE_CHAT_BIZ_ACCOUNT_ID) {
    return 'ตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID เพื่อเปิดรายการแชท OA บน desktop'
  }
  if (staffDirectUserChatEnabled()) {
    return 'เปิดแชทตรงลูกค้า (ตั้ง VITE_LINE_STAFF_DIRECT_USER_CHAT) — ต้องเป็น user id จากแชท OA ไม่ใช่แค่ LINE Login'
  }
  return 'เปิดรายการแชท OA — คัดลอก LINE User ID แล้วค้นหาใน chat.line.biz (ID จากฟอร์มติดต่อ = LINE Login อาจไม่ตรงแชท OA จนกว่าลูกค้าทัก @npcreate)'
}
