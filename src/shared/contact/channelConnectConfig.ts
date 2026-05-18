import { getAppOrigin, isLocalDevHost } from '../config/appUrl'
import { openLineUrlInPlace } from './lineInPlaceOpen'
import { isSupabaseConfigured } from '../supabase/client'

/** Vite inlines `import.meta.env.VITE_*` at build time — empty/missing → '' */
function resolveViteEnv(value: string | undefined): string {
  if (value == null) return ''
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return ''
  return trimmed
}

export const LINE_CHANNEL_ID = resolveViteEnv(import.meta.env.VITE_LINE_CHANNEL_ID)

export const LINE_OA_ID = resolveViteEnv(import.meta.env.VITE_LINE_OA_ID) || '@npcreate'

export const FACEBOOK_APP_ID = resolveViteEnv(import.meta.env.VITE_FACEBOOK_APP_ID)

export const FACEBOOK_PAGE_ID = resolveViteEnv(import.meta.env.VITE_FACEBOOK_PAGE_ID)

export type LineOAuthDisabledReason =
  | 'missing_channel_id'
  | 'missing_supabase'
  | 'missing_callback_url'

const LINE_OAUTH_STATE_KEY = 'npc_contact_line_oauth_state'
const LINE_OA_STEP_KEY = 'npc_contact_line_oa_step_done'
const LINE_OA_PENDING_KEY = 'npc_contact_line_oa_pending'
const LINE_OA_PENDING_MAX_MS = 30 * 60 * 1000
const LINE_USER_KEY = 'npc_contact_line_user_id'
const LINE_NAME_KEY = 'npc_contact_line_display_name'

/** ข้อความเริ่มต้นเมื่อลูกค้าทัก OA จากฟอร์ม /contact */
export const LINE_OA_STARTER_MESSAGE = 'สนใจบริการ'
const FB_PSID_KEY = 'npc_contact_facebook_psid'
const FB_NAME_KEY = 'npc_contact_facebook_name'

export function isLineOAuthConfigured(): boolean {
  return getLineOAuthDisabledReason() === null
}

export function getLineOAuthDisabledReason(): LineOAuthDisabledReason | null {
  if (!isSupabaseConfigured) return 'missing_supabase'
  if (!LINE_CHANNEL_ID) return 'missing_channel_id'
  if (!lineOAuthCallbackUrl()) return 'missing_callback_url'
  return null
}

/** ข้อความเมื่อ LINE Login ปิด — แยกสาเหตุสำหรับ dev vs production */
export function lineOAuthDisabledHint(reason: LineOAuthDisabledReason): string {
  switch (reason) {
    case 'missing_supabase':
      return isLocalDevHost()
        ? 'ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local แล้วรีสตาร์ท npm run dev'
        : 'ระบบยังไม่เชื่อมต่อฐานข้อมูล — ระบุ LINE ID ด้านล่างหรือเพิ่มเพื่อน OA'
    case 'missing_callback_url':
      return isLocalDevHost()
        ? 'ตั้งค่า VITE_SUPABASE_URL ใน .env.local (ใช้สร้าง URL callback ของ LINE Login) แล้วรีสตาร์ท dev server'
        : 'การเชื่อมต่อ LINE Login ยังไม่พร้อมบนระบบนี้ — ระบุ LINE ID ด้านล่างหรือเพิ่มเพื่อน OA'
    case 'missing_channel_id':
    default:
      if (isLocalDevHost()) {
        return 'LINE Login ยังไม่เปิดในเครื่องนี้ — ใส่ VITE_LINE_CHANNEL_ID ใน .env.local แล้วรีสตาร์ท npm run dev (production ตั้งบน Vercel แล้ว redeploy)'
      }
      return 'การเชื่อมต่อ LINE Login ยังไม่พร้อมบนระบบนี้ — ระบุ LINE ID ด้านล่างหรือเพิ่มเพื่อน OA'
  }
}

export function isFacebookLoginConfigured(): boolean {
  return Boolean(FACEBOOK_APP_ID)
}

export function isFacebookChatConfigured(): boolean {
  return Boolean(FACEBOOK_PAGE_ID && FACEBOOK_APP_ID)
}

export function lineOAuthCallbackUrl(): string | null {
  const base = resolveViteEnv(import.meta.env.VITE_SUPABASE_URL)
  if (!base || base.includes('xxxxxxxx')) return null
  return `${base.replace(/\/$/, '')}/functions/v1/line-oauth-callback`
}

export function buildLineOAuthState(): string {
  const payload = { n: crypto.randomUUID(), r: getAppOrigin() }
  const state = btoa(JSON.stringify(payload))
  sessionStorage.setItem(LINE_OAUTH_STATE_KEY, state)
  return state
}

export function consumeStoredLineOAuthState(): string | null {
  const state = sessionStorage.getItem(LINE_OAUTH_STATE_KEY)
  sessionStorage.removeItem(LINE_OAUTH_STATE_KEY)
  return state
}

export function persistLineConnection(userId: string, displayName?: string) {
  sessionStorage.setItem(LINE_USER_KEY, userId)
  if (displayName) sessionStorage.setItem(LINE_NAME_KEY, displayName)
}

export function readLineConnection(): { userId: string; displayName: string | null } | null {
  const userId = sessionStorage.getItem(LINE_USER_KEY)
  if (!userId) return null
  return {
    userId,
    displayName: sessionStorage.getItem(LINE_NAME_KEY),
  }
}

export function clearLineConnection() {
  sessionStorage.removeItem(LINE_USER_KEY)
  sessionStorage.removeItem(LINE_NAME_KEY)
}

export function persistFacebookConnection(psid: string, name?: string) {
  sessionStorage.setItem(FB_PSID_KEY, psid)
  if (name) sessionStorage.setItem(FB_NAME_KEY, name)
}

export function readFacebookConnection(): { psid: string; name: string | null } | null {
  const psid = sessionStorage.getItem(FB_PSID_KEY)
  if (!psid) return null
  return { psid, name: sessionStorage.getItem(FB_NAME_KEY) }
}

export function clearFacebookConnection() {
  sessionStorage.removeItem(FB_PSID_KEY)
  sessionStorage.removeItem(FB_NAME_KEY)
}

export function lineAddFriendUrl(): string {
  const handle = LINE_OA_ID.startsWith('@') ? LINE_OA_ID : `@${LINE_OA_ID}`
  return `https://line.me/R/ti/p/${encodeURIComponent(handle)}`
}

/** @handle สำหรับ path ของ line.me — ไม่ encode @ (LINE ต้องการ @npcreate ใน path) */
export function lineOaHandleForUrl(): string {
  const id = LINE_OA_ID.trim()
  return id.startsWith('@') ? id : `@${id}`
}

/** เปิดแชท OA พร้อมข้อความเริ่มต้น (เพิ่มเพื่อน + ทักในครั้งเดียวบนมือถือ) */
export function lineOaStarterMessageUrl(message = LINE_OA_STARTER_MESSAGE): string {
  const base = `https://line.me/R/oaMessage/${lineOaHandleForUrl()}/`
  return `${base}?text=${encodeURIComponent(message.trim())}`
}

export function markLineOaContactStepDone(): void {
  sessionStorage.setItem(LINE_OA_STEP_KEY, '1')
}

export function readLineOaContactStepDone(): boolean {
  return sessionStorage.getItem(LINE_OA_STEP_KEY) === '1'
}

export function clearLineOaContactStepDone(): void {
  sessionStorage.removeItem(LINE_OA_STEP_KEY)
  sessionStorage.removeItem(LINE_OA_PENDING_KEY)
}

/** ก่อนเปิด LINE — ใช้ตรวจเมื่อผู้ใช้กลับมาที่แท็บ /contact (ไม่เปิดแท็บใหม่) */
export function markLineOaContactPending(): void {
  sessionStorage.setItem(LINE_OA_PENDING_KEY, String(Date.now()))
}

function readLineOaContactPendingAt(): number | null {
  const raw = sessionStorage.getItem(LINE_OA_PENDING_KEY)
  if (!raw) return null
  const at = Number(raw)
  if (!Number.isFinite(at)) {
    sessionStorage.removeItem(LINE_OA_PENDING_KEY)
    return null
  }
  if (Date.now() - at > LINE_OA_PENDING_MAX_MS) {
    sessionStorage.removeItem(LINE_OA_PENDING_KEY)
    return null
  }
  return at
}

/** ผู้ใช้กลับมาหลังเปิด LINE ในหน้าเดียวกัน — คืน true ครั้งเดียว */
export function takeLineOaContactPendingReturn(): boolean {
  const at = readLineOaContactPendingAt()
  if (at == null) return false
  sessionStorage.removeItem(LINE_OA_PENDING_KEY)
  return true
}

/** QR สำหรับสแกนบนคอม — เปิด oaMessage พร้อมข้อความ (ไม่ออกจากหน้า /contact) */
export function lineOaStarterQrImageUrl(message = LINE_OA_STARTER_MESSAGE): string {
  const target = lineOaStarterMessageUrl(message)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(target)}`
}

export async function copyLineOaStarterMessage(message = LINE_OA_STARTER_MESSAGE): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message.trim())
    return true
  } catch {
    return false
  }
}

/** เปิดแอป/แชท LINE โดยไม่พาเบราว์เซอร์ออกจาก /contact */
export function openLineOaStarterMessageFromContact(message = LINE_OA_STARTER_MESSAGE): void {
  markLineOaContactPending()
  openLineUrlInPlace(lineOaStarterMessageUrl(message))
}

export function openLineAddFriendFromContact(): void {
  markLineOaContactPending()
  openLineUrlInPlace(lineAddFriendUrl())
}
