import { lineOaStarterMessageUrl } from '../contact/channelConnectConfig'

const NPCREATE_LINE_OA_URL =
  (import.meta.env.VITE_NPCREATE_LINE_OA_URL as string | undefined)?.trim() ||
  'https://line.me/R/ti/p/@npcreate'
import {
  buildLineChatBizDirectUrl,
  buildLineChatBizInboxUrl,
  isLineMessagingUserIdForUrl,
  lineChatBizAccountIdConfigError,
  normalizeLineChatBizAccountId,
  parseLineChatBizUrl,
} from './lineChatBizUrl'

const LINE_CHAT_BIZ_ACCOUNT_STORAGE_KEY = 'np.line_chat_biz_account_id'

/** จำ account จาก URL ที่วาง (ใช้เมื่อ env ตั้งผิดแต่ลิงก์ถูก) */
export function rememberLineChatBizAccountFromInput(input: string): void {
  if (typeof sessionStorage === 'undefined') return
  const account = parseLineChatBizUrl(input.trim())?.accountId
  if (account) {
    sessionStorage.setItem(LINE_CHAT_BIZ_ACCOUNT_STORAGE_KEY, account)
  }
}

/** account สำหรับสร้างลิงก์ — จำจากลิงก์ที่วางก่อน แล้วค่อย fallback env */
export function getStaffLineChatBizAccountId(): string {
  if (typeof sessionStorage !== 'undefined') {
    const remembered = normalizeLineChatBizAccountId(
      sessionStorage.getItem(LINE_CHAT_BIZ_ACCOUNT_STORAGE_KEY) ?? '',
    )
    if (remembered) return remembered
  }
  return LINE_CHAT_BIZ_ACCOUNT_ID
}

function resolveViteEnv(value: string | undefined): string {
  if (value == null) return ''
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
  return trimmed
}

const RAW_LINE_CHAT_BIZ_ACCOUNT_ID = resolveViteEnv(
  import.meta.env.VITE_LINE_CHAT_BIZ_ACCOUNT_ID,
)

/** account id จาก env (U2626… ไม่ใช่ @npcreate) */
export const LINE_CHAT_BIZ_ACCOUNT_ID = normalizeLineChatBizAccountId(
  RAW_LINE_CHAT_BIZ_ACCOUNT_ID,
)

/** @deprecated ใช้ isLineMessagingUserIdForUrl จาก lineChatBizUrl */
export function isLineMessagingUserId(id: string | null | undefined): id is string {
  return isLineMessagingUserIdForUrl(id)
}

export function isValidLineUserId(id: string | null | undefined): id is string {
  return isLineMessagingUserIdForUrl(id)
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|FxiOS/i.test(ua)
}

export function shouldUseLineOAuthKeeperTab(): boolean {
  if (isMobileBrowser()) return true
  if (typeof navigator === 'undefined') return false
  return isSafariBrowser() && navigator.maxTouchPoints > 1
}

export function lineOaMessageUrlWithText(text: string): string {
  return lineOaStarterMessageUrl(text)
}

export function staffLineOaInboxUrl(): string | null {
  return buildLineChatBizInboxUrl(LINE_CHAT_BIZ_ACCOUNT_ID)
}

export function staffLineDirectUserChatUrl(lineUserId: string): string | null {
  return buildLineChatBizDirectUrl(lineUserId, LINE_CHAT_BIZ_ACCOUNT_ID)
}

function staffDirectUserChatEnabled(options?: { directUserChat?: boolean }): boolean {
  if (options?.directUserChat != null) return options.directUserChat
  const flag = resolveViteEnv(import.meta.env.VITE_LINE_STAFF_DIRECT_USER_CHAT)
  return flag === '1' || flag.toLowerCase() === 'true'
}

export type StaffLineChatOpenMode = 'auto' | 'inbox' | 'direct'

export type ResolveStaffLineChatOpenResult =
  | { ok: true; url: string }
  | { ok: false; message: string }

export function resolveStaffLineChatOpenUrl(
  chatUserId: string | null | undefined,
  options?: { mode?: StaffLineChatOpenMode },
): ResolveStaffLineChatOpenResult {
  const uid = chatUserId?.trim() ?? ''
  const mode = options?.mode ?? 'auto'

  const accountId = getStaffLineChatBizAccountId()
  const configErr = lineChatBizAccountIdConfigError(accountId)
  if (configErr) return { ok: false, message: configErr }

  if (mode === 'direct') {
    if (!isLineMessagingUserIdForUrl(uid)) {
      return {
        ok: false,
        message:
          'ต้องบันทึก LINE User ID จาก URL แชท OA (หลัง /chat/) — ใช้ Login ID เปิดแชทตรงไม่ได้',
      }
    }
    const url = buildLineChatBizDirectUrl(uid, accountId)
    if (!url) {
      return { ok: false, message: 'สร้างลิงก์แชทไม่สำเร็จ — ตรวจสอบ VITE_LINE_CHAT_BIZ_ACCOUNT_ID' }
    }
    return { ok: true, url }
  }

  const inbox = buildLineChatBizInboxUrl(accountId)
  if (inbox) return { ok: true, url: inbox }

  return { ok: true, url: NPCREATE_LINE_OA_URL }
}

export function staffLineChatUrl(
  lineUserId?: string | null,
  options?: {
    text?: string
    directUserChat?: boolean
    mode?: StaffLineChatOpenMode
  },
): string {
  const uid = lineUserId?.trim()
  const mode = options?.mode ?? 'auto'
  const useDirect =
    mode === 'direct' ||
    (mode === 'auto' && staffDirectUserChatEnabled(options) && isLineMessagingUserIdForUrl(uid))

  if (useDirect && uid) {
    const resolved = resolveStaffLineChatOpenUrl(uid, { mode: 'direct' })
    if (resolved.ok) return resolved.url
  }

  const resolved = resolveStaffLineChatOpenUrl(uid || null, {
    mode: mode === 'direct' ? 'inbox' : mode,
  })
  if (resolved.ok) return resolved.url

  const text = options?.text?.trim()
  if (text) return lineOaMessageUrlWithText(text)
  return NPCREATE_LINE_OA_URL
}

export type StaffLineChatOpenOptions = {
  mode?: StaffLineChatOpenMode
}

export type OpenStaffLineChatFromUserIdResult =
  | { ok: true; opened: boolean; url: string }
  | { ok: false; message: string }

/** เปิดแท็บทันทีใน user gesture (ไม่ async ก่อน window.open) */
export function openStaffLineChatFromUserId(
  chatUserId: string | null | undefined,
  options?: StaffLineChatOpenOptions,
): OpenStaffLineChatFromUserIdResult {
  const uid = chatUserId?.trim() ?? ''
  const mode = options?.mode ?? 'auto'
  const useDirect =
    mode === 'direct' ||
    (mode === 'auto' && staffDirectUserChatEnabled() && isLineMessagingUserIdForUrl(uid))

  const resolved = resolveStaffLineChatOpenUrl(uid || null, {
    mode: useDirect && uid ? 'direct' : mode === 'direct' ? 'inbox' : mode,
  })

  if (!resolved.ok) {
    return { ok: false, message: resolved.message }
  }

  const opened = openUrlInNewTab(resolved.url)
  if (uid && !useDirect) {
    void copyLineUserIdForStaffSearch(uid)
  }
  return { ok: true, opened, url: resolved.url }
}

export function openUrlInNewTab(url: string): boolean {
  const win = window.open(url, '_blank', 'noopener,noreferrer')
  if (win) return true
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    return true
  } catch {
    return false
  }
}

async function copyLineUserIdForStaffSearch(userId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(userId.trim())
    return true
  } catch {
    return false
  }
}

export async function openStaffLineChat(
  lineUserId?: string | null,
  options?: {
    text?: string
    directUserChat?: boolean
    mode?: StaffLineChatOpenMode
  },
): Promise<boolean> {
  const result = openStaffLineChatFromUserId(lineUserId, { mode: options?.mode })
  if (result.ok) return result.opened

  const url = staffLineChatUrl(lineUserId, { ...options, mode: 'inbox' })
  return openUrlInNewTab(url)
}

export function staffLineDirectChatHint(lineUserId?: string | null): string | null {
  if (!lineUserId?.trim()) {
    return 'ยังไม่มี LINE User ID — ให้ลูกค้าเชื่อมต่อ LINE จากฟอร์มติดต่อหรือเพิ่มเพื่อน OA'
  }
  if (!isLineMessagingUserIdForUrl(lineUserId)) {
    return 'LINE User ID ไม่ถูกรูปแบบ (U ตามด้วยตัวเลข a-f 32 ตัว)'
  }
  const configErr = lineChatBizAccountIdConfigError(getStaffLineChatBizAccountId())
  if (configErr) return configErr
  if (staffDirectUserChatEnabled()) {
    return 'เปิดแชทตรง — ต้องเป็น user id จากแชท OA (หลัง /chat/ ใน URL)'
  }
  return 'เปิดรายการแชท OA — คัดลอก user id จาก URL แชทลูกค้าแล้วค้นหา'
}
