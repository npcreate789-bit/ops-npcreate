import { LINE_OA_ID } from '../contact/channelConnectConfig'
import { NPCREATE_LINE_OA_URL } from '../crm/preferredContactChannel'

function resolveViteEnv(value: string | undefined): string {
  if (value == null) return ''
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
  return trimmed
}

/** LINE Official Account chat id on chat.line.biz (จาก URL แชท OA) */
export const LINE_CHAT_BIZ_ACCOUNT_ID = resolveViteEnv(
  import.meta.env.VITE_LINE_CHAT_BIZ_ACCOUNT_ID,
)

const LINE_USER_ID_RE = /^U[a-zA-Z0-9]+$/

export function isValidLineUserId(id: string | null | undefined): id is string {
  const trimmed = id?.trim()
  return Boolean(trimmed && LINE_USER_ID_RE.test(trimmed))
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

function lineOaHandle(): string {
  return LINE_OA_ID.startsWith('@') ? LINE_OA_ID : `@${LINE_OA_ID}`
}

/** ลิงก์ line.me พร้อมข้อความล่วงหน้า (มือถือ / fallback) */
export function lineOaMessageUrlWithText(text: string): string {
  const base = `https://line.me/R/oaMessage/${encodeURIComponent(lineOaHandle())}/`
  return `${base}?text=${encodeURIComponent(text.trim())}`
}

/**
 * URL สำหรับทีมเปิดแชท LINE กับลูกค้า
 * - มี line_user_id + VITE_LINE_CHAT_BIZ_ACCOUNT_ID → chat.line.biz/.../chat/{userId}
 * - ไม่มี user id → OA ทั่วไป (หรือ oaMessage พร้อม text)
 */
export function staffLineChatUrl(
  lineUserId?: string | null,
  options?: { text?: string },
): string {
  const uid = lineUserId?.trim()
  if (isValidLineUserId(uid) && LINE_CHAT_BIZ_ACCOUNT_ID) {
    return `https://chat.line.biz/${LINE_CHAT_BIZ_ACCOUNT_ID}/chat/${uid}`
  }
  const text = options?.text?.trim()
  if (text) return lineOaMessageUrlWithText(text)
  return NPCREATE_LINE_OA_URL
}

export function openStaffLineChat(
  lineUserId?: string | null,
  options?: { text?: string },
): void {
  const url = staffLineChatUrl(lineUserId, options)
  window.open(url, '_blank', 'noopener,noreferrer')
}

/** เตือนเมื่อยังเปิดแชทตรงลูกค้าไม่ได้ */
export function staffLineDirectChatHint(lineUserId?: string | null): string | null {
  if (!lineUserId?.trim()) {
    return 'ยังไม่มี LINE User ID — ให้ลูกค้าเชื่อมต่อ LINE จากฟอร์มติดต่อหรือเพิ่มเพื่อน OA'
  }
  if (!isValidLineUserId(lineUserId)) {
    return 'LINE User ID ไม่ถูกรูปแบบ (ต้องขึ้นต้นด้วย U ตามด้วยตัวอักษร/ตัวเลข)'
  }
  if (!LINE_CHAT_BIZ_ACCOUNT_ID) {
    return 'ตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID เพื่อเปิดแชทลูกค้าโดยตรงบน desktop'
  }
  return null
}
