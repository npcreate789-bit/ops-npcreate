import {
  buildLineOAuthState,
  lineOAuthCallbackUrl,
  LINE_CHANNEL_ID,
  persistLineConnection,
} from './channelConnectConfig'

const LINE_AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize'

export interface LineOAuthCallbackParams {
  line_user_id?: string
  line_name?: string
  line_error?: string
  line_connected?: string
}

/** เริ่ม LINE Login — redirect ไป LINE แล้วกลับผ่าน edge function */
export function startLineLogin(): void {
  const redirectUri = lineOAuthCallbackUrl()
  if (!redirectUri || !LINE_CHANNEL_ID) {
    throw new Error('LINE Login ยังไม่ได้ตั้งค่า')
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

  window.location.assign(`${LINE_AUTH_URL}?${params.toString()}`)
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
