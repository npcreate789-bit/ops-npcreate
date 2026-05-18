/** ส่งผล LINE Login จากแท็บ callback กลับแท็บ /contact เดิม */
export const LINE_OAUTH_BROADCAST_CHANNEL = 'npc_contact_line_oauth'
export const LINE_OAUTH_RESULT_LS_KEY = 'npc_contact_line_oauth_result'
/** ชื่อหน้าต่างจาก window.open — ใช้ปิดแท็บ access.line.me ที่ค้าง */
export const LINE_OAUTH_POPUP_WINDOW_NAME = 'npc_line_oauth'
const LINE_OAUTH_KEEPER_TAB_KEY = 'npc_contact_line_oauth_keeper'
const RESULT_MAX_AGE_MS = 5 * 60 * 1000

export type LineOAuthBroadcastPayload =
  | {
      type: 'success'
      userId: string
      displayName: string | null
      at: number
    }
  | {
      type: 'error'
      error: string
      at: number
    }

export function markLineOAuthKeeperTab(): void {
  try {
    sessionStorage.setItem(LINE_OAUTH_KEEPER_TAB_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isLineOAuthKeeperTab(): boolean {
  try {
    return sessionStorage.getItem(LINE_OAUTH_KEEPER_TAB_KEY) === '1'
  } catch {
    return false
  }
}

export function clearLineOAuthKeeperTab(): void {
  try {
    sessionStorage.removeItem(LINE_OAUTH_KEEPER_TAB_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * ปิดหน้าต่าง OAuth ที่ keeper เปิดไว้เท่านั้น — ไม่ใช้ window.open('', name)
 * เพราะบางเบราว์เซอร์อาจปิด/เปลี่ยนแท็บ /contact ผิดตัว
 */
export function closeLineOAuthPopupWindow(popupRef?: Window | null): void {
  if (!popupRef || popupRef === window || popupRef.closed) return
  try {
    popupRef.close()
  } catch {
    /* ignore */
  }
}

export function publishLineOAuthResult(payload: LineOAuthBroadcastPayload): void {
  try {
    localStorage.setItem(LINE_OAUTH_RESULT_LS_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }

  try {
    const channel = new BroadcastChannel(LINE_OAUTH_BROADCAST_CHANNEL)
    channel.postMessage(payload)
    channel.close()
  } catch {
    /* ignore */
  }

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage({ source: 'npc_line_oauth', ...payload }, window.location.origin)
    } catch {
      /* ignore */
    }
  }
}

export function readLineOAuthBroadcastResult(): LineOAuthBroadcastPayload | null {
  try {
    const raw = localStorage.getItem(LINE_OAUTH_RESULT_LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LineOAuthBroadcastPayload
    if (!parsed?.at || Date.now() - parsed.at > RESULT_MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function clearLineOAuthBroadcastResult(): void {
  try {
    localStorage.removeItem(LINE_OAUTH_RESULT_LS_KEY)
  } catch {
    /* ignore */
  }
}

export function subscribeLineOAuthBroadcast(
  handler: (payload: LineOAuthBroadcastPayload) => void,
): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LINE_OAUTH_RESULT_LS_KEY || !event.newValue) return
    try {
      handler(JSON.parse(event.newValue) as LineOAuthBroadcastPayload)
    } catch {
      /* ignore */
    }
  }

  const onWindowMessage = (event: MessageEvent) => {
    const data = event.data as LineOAuthBroadcastPayload & { source?: string }
    if (data?.source !== 'npc_line_oauth' || !data?.type) return
    handler(data)
  }

  let channel: BroadcastChannel | null = null
  const onChannelMessage = (event: MessageEvent<LineOAuthBroadcastPayload>) => {
    handler(event.data)
  }

  window.addEventListener('storage', onStorage)
  window.addEventListener('message', onWindowMessage)
  try {
    channel = new BroadcastChannel(LINE_OAUTH_BROADCAST_CHANNEL)
    channel.onmessage = onChannelMessage
  } catch {
    /* ignore */
  }

  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('message', onWindowMessage)
    channel?.close()
  }
}

/** แท็บ callback ชั่วคราว — ปิดได้เมื่อไม่ใช่แท็บ keeper (มือถือมักไม่มี window.opener) */
export function tryCloseLineOAuthCallbackTab(): void {
  if (isLineOAuthKeeperTab()) return

  const params = new URLSearchParams(window.location.search)
  const isOAuthReturn =
    params.has('code') ||
    params.has('line_connected') ||
    params.has('line_error') ||
    params.has('error')

  if (!isOAuthReturn && !window.opener && window.name !== LINE_OAUTH_POPUP_WINDOW_NAME) {
    return
  }

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.focus()
    } catch {
      /* ignore */
    }
  }

  window.setTimeout(() => {
    try {
      window.close()
    } catch {
      /* ignore */
    }
  }, 400)
}
