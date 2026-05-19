import {
  buildLineOAuthState,
  consumeStoredLineOAuthState,
  getLineOAuthDisabledReason,
  isValidLineLoginChannelId,
  lineOAuthDisabledHint,
  lineOAuthRedirectUri,
  LINE_CHANNEL_ID,
  persistLineConnection,
} from './channelConnectConfig'
import type { LineOAuthBroadcastPayload } from './lineOAuthBroadcast'
import {
  clearOAuthCallbackOwner,
  clearLineOAuthBroadcastResult,
  clearLineOAuthKeeperTab,
  dismissDuplicateOAuthCallbackTab,
  finalizeOAuthCallbackTabs,
  markLineOAuthKeeperTab,
  openLineOAuthAuxTab,
  publishLineOAuthResult,
  readLineOAuthBroadcastResult,
  resolveOAuthCallbackTabRole,
} from './lineOAuthBroadcast'
import { shouldUseLineOAuthKeeperTab } from '../line/lineStaffOpenUrl'
import { isSupabaseConfigured, supabase } from '../supabase/client'
import { parseFunctionInvokeError } from '../supabase/parseFunctionInvokeError'

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_OAUTH_IN_PROGRESS_KEY = 'npc_contact_line_oauth_in_progress'

export interface LineOAuthCallbackParams {
  line_user_id?: string
  line_name?: string
  line_error?: string
  line_connected?: string
}

function buildLineAuthorizeUrl(): string {
  const redirectUri = lineOAuthRedirectUri()
  const disabled = getLineOAuthDisabledReason()
  if (!redirectUri || !LINE_CHANNEL_ID || disabled) {
    throw new Error(
      disabled ? lineOAuthDisabledHint(disabled) : 'LINE Login ยังไม่ได้ตั้งค่า',
    )
  }

  if (!isValidLineLoginChannelId(LINE_CHANNEL_ID)) {
    throw new Error(
      'LINE Channel ID ไม่ถูกต้อง — ใช้ Channel ID จากแท็บ LINE Login ใน Developers Console (ตัวเลขเท่านั้น)',
    )
  }

  const state = buildLineOAuthState()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID.trim(),
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
    bot_prompt: 'normal',
    ui_locales: 'th',
  })

  return `${LINE_AUTH_URL}?${params.toString()}`
}

function markLineOAuthInProgress(): void {
  try {
    sessionStorage.setItem(LINE_OAUTH_IN_PROGRESS_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export function clearLineOAuthInProgress(): void {
  try {
    sessionStorage.removeItem(LINE_OAUTH_IN_PROGRESS_KEY)
  } catch {
    /* ignore */
  }
}

export function isLineOAuthInProgress(): boolean {
  try {
    return Boolean(sessionStorage.getItem(LINE_OAUTH_IN_PROGRESS_KEY))
  } catch {
    return false
  }
}

function applyOAuthSuccess(userId: string, displayName: string | null): void {
  persistLineConnection(userId, displayName ?? undefined)
  publishLineOAuthResult({
    type: 'success',
    userId,
    displayName,
    at: Date.now(),
  })
  clearLineOAuthInProgress()
}

function applyOAuthError(message: string): void {
  publishLineOAuthResult({
    type: 'error',
    error: message,
    at: Date.now(),
  })
  clearLineOAuthInProgress()
}

/**
 * LINE Login —
 * มือถือ: ค้าง /contact (keeper) เปิด access.line.me ในแท็บใหม่ → broadcast กลับ
 * เดสก์ท็อป: แท็บเดียว location.replace
 */
export function startLineLogin(): void {
  const url = buildLineAuthorizeUrl()
  markLineOAuthInProgress()
  clearOAuthCallbackOwner()

  if (shouldUseLineOAuthKeeperTab()) {
    markLineOAuthKeeperTab()
    const oauthTab = openLineOAuthAuxTab(url)
    if (oauthTab) {
      try {
        oauthTab.focus()
      } catch {
        /* ignore */
      }
      return
    }
    clearLineOAuthKeeperTab()
  }

  window.location.replace(url)
}

/**
 * แลก code บน /contact หลัง LINE redirect กลับมาแท็บเดิม
 */
export async function completeLineOAuthFromCallback(
  searchParams: URLSearchParams,
): Promise<
  { ok: true; userId: string; displayName: string | null } | { ok: false; error: string } | null
> {
  const tabRole = resolveOAuthCallbackTabRole()
  if (tabRole === 'duplicate') {
    dismissDuplicateOAuthCallbackTab()
    return null
  }

  const oauthError = searchParams.get('error')
  if (oauthError) {
    const message = mapLineOAuthError(oauthError)
    applyOAuthError(message)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: message }
  }

  const code = searchParams.get('code')?.trim()
  const stateParam = searchParams.get('state')?.trim()
  if (!code || !stateParam) return null

  const storedState = consumeStoredLineOAuthState()
  if (!storedState || storedState !== stateParam) {
    const message = 'เซสชัน LINE Login หมดอายุ — กรุณากดเชื่อมต่อใหม่'
    applyOAuthError(message)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: message }
  }

  if (!isSupabaseConfigured || !supabase) {
    const message = 'ระบบยังไม่พร้อม — ลองใหม่ภายหลัง'
    applyOAuthError(message)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: message }
  }

  const { data, error } = await supabase.functions.invoke('line-oauth-callback', {
    body: {
      code,
      state: stateParam,
      redirect_uri: lineOAuthRedirectUri(),
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    const friendly = message || 'เชื่อมต่อ LINE ไม่สำเร็จ'
    applyOAuthError(friendly)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: friendly }
  }

  const result = data as {
    ok?: boolean
    user_id?: string
    display_name?: string | null
    error?: string
  } | null

  if (!result?.ok || !result.user_id) {
    const message = mapLineOAuthError(result?.error ?? 'token_exchange_failed')
    applyOAuthError(message)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: message }
  }

  const displayName = result.display_name ?? null
  applyOAuthSuccess(result.user_id, displayName)
  stripLineOAuthParamsFromUrl()
  finalizeOAuthCallbackTabs()

  return {
    ok: true,
    userId: result.user_id,
    displayName,
  }
}

/** อ่าน query หลัง redirect จาก edge (รูปแบบเดิม line_connected=1) */
export function applyLineOAuthCallbackFromUrl(
  searchParams: URLSearchParams,
): { ok: true; userId: string; displayName: string | null } | { ok: false; error: string } | null {
  const tabRole = resolveOAuthCallbackTabRole()
  if (tabRole === 'duplicate') {
    dismissDuplicateOAuthCallbackTab()
    return null
  }

  const error = searchParams.get('line_error')
  if (error) {
    const message = mapLineOAuthError(error)
    applyOAuthError(message)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: message }
  }

  if (searchParams.get('line_connected') !== '1') return null

  const userId = searchParams.get('line_user_id')?.trim()
  if (!userId) {
    const message = 'ไม่พบ LINE user ID — ลองเชื่อมต่อใหม่'
    applyOAuthError(message)
    finalizeOAuthCallbackTabs()
    return { ok: false, error: message }
  }

  const displayName = searchParams.get('line_name')?.trim() || null
  applyOAuthSuccess(userId, displayName)
  stripLineOAuthParamsFromUrl()
  finalizeOAuthCallbackTabs()
  return { ok: true, userId, displayName }
}

/** อ่านผล OAuth จาก broadcast/storage (เมื่อ LINE เปิดแท็บ callback แยก) */
export function consumeLineOAuthBroadcastResult():
  | { ok: true; userId: string; displayName: string | null }
  | { ok: false; error: string }
  | null {
  const payload = readLineOAuthBroadcastResult()
  if (!payload) return null
  clearLineOAuthBroadcastResult()
  const applied = applyLineOAuthBroadcastPayload(payload)
  if ('userId' in applied) {
    return { ok: true, userId: applied.userId, displayName: applied.displayName }
  }
  return { ok: false, error: applied.error }
}

function mapLineOAuthError(code: string): string {
  switch (code) {
    case 'access_denied':
      return 'ยกเลิกการเชื่อมต่อ LINE'
    case 'server_not_configured':
      return 'ระบบ LINE Login ยังไม่พร้อม — ติดต่อทีม NP Create'
    case 'token_exchange_failed':
    case 'profile_failed':
    case 'invalid_state':
      return 'เชื่อมต่อ LINE ไม่สำเร็จ — ลองใหม่อีกครั้ง'
    default:
      return 'เชื่อมต่อ LINE ไม่สำเร็จ'
  }
}

export function stripLineOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href)
  const keys = [
    'line_connected',
    'line_user_id',
    'line_name',
    'line_error',
    'code',
    'state',
    'error',
    'error_description',
  ]
  let changed = false
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) {
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }
}

export function applyLineOAuthBroadcastPayload(
  payload: LineOAuthBroadcastPayload,
): { userId: string; displayName: string | null } | { error: string } {
  if (payload.type === 'success') {
    persistLineConnection(payload.userId, payload.displayName ?? undefined)
    clearLineOAuthInProgress()
    return { userId: payload.userId, displayName: payload.displayName }
  }
  if (payload.type === 'error') {
    clearLineOAuthInProgress()
    return { error: payload.error }
  }
  clearLineOAuthInProgress()
  return { error: 'เชื่อมต่อ LINE ไม่สำเร็จ' }
}

export type { LineOAuthBroadcastPayload, OAuthCallbackTabRole } from './lineOAuthBroadcast'
export {
  clearLineOAuthBroadcastResult,
  clearLineOAuthKeeperTab,
  closeLineOAuthAuxWindow,
  isLineOAuthKeeperTab,
  readLineOAuthBroadcastResult,
  resolveOAuthCallbackTabRole,
  subscribeLineOAuthBroadcast,
} from './lineOAuthBroadcast'
