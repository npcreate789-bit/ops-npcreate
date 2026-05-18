import {
  buildLineOAuthState,
  getLineOAuthDisabledReason,
  lineOAuthCallbackUrl,
  LINE_CHANNEL_ID,
  lineOAuthDisabledHint,
  persistLineConnection,
} from './channelConnectConfig'

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'
const LINE_LOGIN_POPUP_NAME = 'npcreate_line_login'

export interface LineOAuthCallbackParams {
  line_user_id?: string
  line_name?: string
  line_error?: string
  line_connected?: string
}

function buildLineAuthorizeUrl(): string {
  const redirectUri = lineOAuthCallbackUrl()
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
    bot_prompt: 'aggressive',
  })

  return `${LINE_AUTH_URL}?${params.toString()}`
}

function openLineLoginPopup(url: string): Window | null {
  const width = 480
  const height = 700
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2)
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2)
  const features = [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'noopener=no',
    'noreferrer=no',
  ].join(',')

  const popup = window.open(url, LINE_LOGIN_POPUP_NAME, features)
  if (!popup) return null
  try {
    popup.focus()
  } catch {
    /* ignore */
  }
  return popup
}

/** เริ่ม LINE Login — เปิด popup ถ้าได้ (หน้า /contact ค้าง) ไม่ได้จึง redirect เต็มหน้า */
export function startLineLogin(): void {
  const url = buildLineAuthorizeUrl()
  const popup = openLineLoginPopup(url)
  if (popup) return
  window.location.assign(url)
}

function isLineOAuthReturnUrl(searchParams: URLSearchParams): boolean {
  return (
    searchParams.get('line_connected') === '1' ||
    Boolean(searchParams.get('line_error')?.trim())
  )
}

/**
 * ถ้า OAuth จบใน popup — ส่ง URL กลับหน้า /contact หลักแล้วปิด popup
 * (ลดแท็บ access.line.me ค้าง)
 */
export function finishLineOAuthPopupReturn(searchParams: URLSearchParams): boolean {
  if (typeof window === 'undefined') return false
  if (!isLineOAuthReturnUrl(searchParams)) return false
  if (!window.opener || window.opener.closed) return false

  try {
    window.opener.location.href = window.location.href
    window.opener.focus()
    window.close()
    return true
  } catch {
    return false
  }
}

/** อ่าน query หลัง redirect กลับจาก edge function */
export function applyLineOAuthCallbackFromUrl(
  searchParams: URLSearchParams,
): { ok: true; userId: string; displayName: string | null } | { ok: false; error: string } | null {
  const error = searchParams.get('line_error')
  if (error) {
    return { ok: false, error: mapLineOAuthError(error) }
  }

  if (searchParams.get('line_connected') !== '1') return null

  const userId = searchParams.get('line_user_id')?.trim()
  if (!userId) {
    return { ok: false, error: 'ไม่พบ LINE user ID — ลองเชื่อมต่อใหม่' }
  }

  const displayName = searchParams.get('line_name')?.trim() || null
  persistLineConnection(userId, displayName ?? undefined)
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
      return 'เชื่อมต่อ LINE ไม่สำเร็จ — ลองใหม่อีกครั้ง'
    default:
      return 'เชื่อมต่อ LINE ไม่สำเร็จ'
  }
}

export function stripLineOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href)
  const keys = ['line_connected', 'line_user_id', 'line_name', 'line_error', 'code', 'state']
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
