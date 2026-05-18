import {
  buildLineOAuthState,
  consumeStoredLineOAuthState,
  getLineOAuthDisabledReason,
  lineOAuthDisabledHint,
  lineOAuthRedirectUri,
  LINE_CHANNEL_ID,
  markLineOaContactPending,
  persistLineConnection,
} from './channelConnectConfig'
import { openLineUrlInPlace } from './lineInPlaceOpen'
import { isMobileBrowser } from '../line/lineStaffOpenUrl'
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

  const state = buildLineOAuthState()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID,
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

/**
 * เริ่ม LINE Login
 * - มือถือ: เปิดแอป LINE / access.line.me โดยไม่พาเบราว์เซอร์ออกจาก /contact (ไม่สร้างแท็บใหม่)
 * - เดสก์ท็อป: แทนที่ URL ในแท็บเดิม (replace ไม่ใช่แท็บใหม่)
 */
export function startLineLogin(): void {
  const url = buildLineAuthorizeUrl()
  markLineOAuthInProgress()
  markLineOaContactPending()

  if (isMobileBrowser()) {
    openLineUrlInPlace(url)
    return
  }

  window.location.replace(url)
}

/**
 * แลก code บน /contact (redirect_uri = /contact) แล้วบันทึก LINE user
 */
export async function completeLineOAuthFromCallback(
  searchParams: URLSearchParams,
): Promise<
  { ok: true; userId: string; displayName: string | null } | { ok: false; error: string } | null
> {
  const oauthError = searchParams.get('error')
  if (oauthError) {
    clearLineOAuthInProgress()
    return { ok: false, error: mapLineOAuthError(oauthError) }
  }

  const code = searchParams.get('code')?.trim()
  const stateParam = searchParams.get('state')?.trim()
  if (!code || !stateParam) return null

  const storedState = consumeStoredLineOAuthState()
  if (!storedState || storedState !== stateParam) {
    clearLineOAuthInProgress()
    return { ok: false, error: 'เซสชัน LINE Login หมดอายุ — กรุณากดเชื่อมต่อใหม่' }
  }

  if (!isSupabaseConfigured || !supabase) {
    clearLineOAuthInProgress()
    return { ok: false, error: 'ระบบยังไม่พร้อม — ลองใหม่ภายหลัง' }
  }

  const { data, error } = await supabase.functions.invoke('line-oauth-callback', {
    body: {
      code,
      state: stateParam,
      redirect_uri: lineOAuthRedirectUri(),
    },
  })

  if (error) {
    clearLineOAuthInProgress()
    const message = await parseFunctionInvokeError(error, data)
    return { ok: false, error: message || 'เชื่อมต่อ LINE ไม่สำเร็จ' }
  }

  const result = data as {
    ok?: boolean
    user_id?: string
    display_name?: string | null
    error?: string
  } | null

  if (!result?.ok || !result.user_id) {
    clearLineOAuthInProgress()
    return {
      ok: false,
      error: mapLineOAuthError(result?.error ?? 'token_exchange_failed'),
    }
  }

  persistLineConnection(result.user_id, result.display_name ?? undefined)
  clearLineOAuthInProgress()
  return {
    ok: true,
    userId: result.user_id,
    displayName: result.display_name ?? null,
  }
}

/** อ่าน query หลัง redirect จาก edge (รูปแบบเดิม line_connected=1) */
export function applyLineOAuthCallbackFromUrl(
  searchParams: URLSearchParams,
): { ok: true; userId: string; displayName: string | null } | { ok: false; error: string } | null {
  const error = searchParams.get('line_error')
  if (error) {
    clearLineOAuthInProgress()
    return { ok: false, error: mapLineOAuthError(error) }
  }

  if (searchParams.get('line_connected') !== '1') return null

  const userId = searchParams.get('line_user_id')?.trim()
  if (!userId) {
    clearLineOAuthInProgress()
    return { ok: false, error: 'ไม่พบ LINE user ID — ลองเชื่อมต่อใหม่' }
  }

  const displayName = searchParams.get('line_name')?.trim() || null
  persistLineConnection(userId, displayName ?? undefined)
  clearLineOAuthInProgress()
  return { ok: true, userId, displayName }
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
