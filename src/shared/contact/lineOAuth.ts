import {
  buildLineOAuthState,
  consumeStoredLineOAuthState,
  getLineOAuthDisabledReason,
  lineOAuthDisabledHint,
  lineOAuthRedirectUri,
  LINE_CHANNEL_ID,
  persistLineConnection,
} from './channelConnectConfig'
import {
  clearLineOAuthKeeperTab,
  closeLineOAuthPopupWindow,
  LINE_OAUTH_POPUP_WINDOW_NAME,
  markLineOAuthKeeperTab,
  publishLineOAuthResult,
  tryCloseLineOAuthCallbackTab,
} from './lineOAuthBroadcast'
import { isLineContactMobileDevice } from './lineInPlaceOpen'
import { isSupabaseConfigured, supabase } from '../supabase/client'
import { parseFunctionInvokeError } from '../supabase/parseFunctionInvokeError'

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_OAUTH_IN_PROGRESS_KEY = 'npc_contact_line_oauth_in_progress'

let lineOAuthPopupRef: Window | null = null

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

function openLineOAuthInNewTab(url: string): Window | null {
  if (isLineContactMobileDevice()) {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    return null
  }

  const popup = window.open(url, LINE_OAUTH_POPUP_WINDOW_NAME)
  if (!popup || popup === window) return null
  return popup
}

/**
 * แท็บ /contact เดิมค้างอยู่ — เปิด OAuth ในแท็บ/หน้าต่างอื่น
 * แท็บ callback ส่งผลกลับมาที่นี่ผ่าน BroadcastChannel
 */
export function startLineLogin(): void {
  const url = buildLineAuthorizeUrl()
  markLineOAuthInProgress()
  markLineOAuthKeeperTab()

  closeLineOAuthPopupWindow(lineOAuthPopupRef)
  lineOAuthPopupRef = null

  const popup = openLineOAuthInNewTab(url)
  if (popup) {
    lineOAuthPopupRef = popup
    try {
      popup.focus()
    } catch {
      /* ignore */
    }
    return
  }

  if (!isLineContactMobileDevice()) {
    clearLineOAuthKeeperTab()
    clearLineOAuthInProgress()
    throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป — อนุญาตป๊อปอัปแล้วลองใหม่')
  }
}

/** เรียกจากแท็บ keeper หลังได้ผล OAuth สำเร็จเท่านั้น */
export function cleanupLineOAuthAfterKeeperReturn(): void {
  closeLineOAuthPopupWindow(lineOAuthPopupRef)
  lineOAuthPopupRef = null
  clearLineOAuthKeeperTab()
  try {
    window.focus()
  } catch {
    /* ignore */
  }
}

/**
 * แลก code บน /contact (มักเป็นแท็บใหม่ที่ LINE เปิด)
 */
export async function completeLineOAuthFromCallback(
  searchParams: URLSearchParams,
): Promise<
  { ok: true; userId: string; displayName: string | null } | { ok: false; error: string } | null
> {
  const oauthError = searchParams.get('error')
  if (oauthError) {
    const message = mapLineOAuthError(oauthError)
    applyOAuthError(message)
    tryCloseLineOAuthCallbackTab()
    return { ok: false, error: message }
  }

  const code = searchParams.get('code')?.trim()
  const stateParam = searchParams.get('state')?.trim()
  if (!code || !stateParam) return null

  const storedState = consumeStoredLineOAuthState()
  if (!storedState || storedState !== stateParam) {
    const message = 'เซสชัน LINE Login หมดอายุ — กรุณากดเชื่อมต่อใหม่'
    applyOAuthError(message)
    tryCloseLineOAuthCallbackTab()
    return { ok: false, error: message }
  }

  if (!isSupabaseConfigured || !supabase) {
    const message = 'ระบบยังไม่พร้อม — ลองใหม่ภายหลัง'
    applyOAuthError(message)
    tryCloseLineOAuthCallbackTab()
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
    tryCloseLineOAuthCallbackTab()
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
    tryCloseLineOAuthCallbackTab()
    return { ok: false, error: message }
  }

  const displayName = result.display_name ?? null
  applyOAuthSuccess(result.user_id, displayName)
  stripLineOAuthParamsFromUrl()
  tryCloseLineOAuthCallbackTab()

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
  const error = searchParams.get('line_error')
  if (error) {
    const message = mapLineOAuthError(error)
    applyOAuthError(message)
    tryCloseLineOAuthCallbackTab()
    return { ok: false, error: message }
  }

  if (searchParams.get('line_connected') !== '1') return null

  const userId = searchParams.get('line_user_id')?.trim()
  if (!userId) {
    const message = 'ไม่พบ LINE user ID — ลองเชื่อมต่อใหม่'
    applyOAuthError(message)
    return { ok: false, error: message }
  }

  const displayName = searchParams.get('line_name')?.trim() || null
  applyOAuthSuccess(userId, displayName)
  stripLineOAuthParamsFromUrl()
  tryCloseLineOAuthCallbackTab()
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

export type { LineOAuthBroadcastPayload } from './lineOAuthBroadcast'
export {
  clearLineOAuthBroadcastResult,
  closeLineOAuthPopupWindow,
  isLineOAuthKeeperTab,
  readLineOAuthBroadcastResult,
  subscribeLineOAuthBroadcast,
} from './lineOAuthBroadcast'
