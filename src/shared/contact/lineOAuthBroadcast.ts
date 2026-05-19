/** ส่งผล LINE Login จากแท็บ callback กลับแท็บ /contact เดิม */
export const LINE_OAUTH_BROADCAST_CHANNEL = 'npc_contact_line_oauth'
export const LINE_OAUTH_RESULT_LS_KEY = 'npc_contact_line_oauth_result'
export const LINE_OAUTH_POPUP_WINDOW_NAME = 'npc_line_oauth'
const LINE_OAUTH_KEEPER_TAB_KEY = 'npc_contact_line_oauth_keeper'
const LINE_OAUTH_CALLBACK_OWNER_KEY = 'npc_contact_line_oauth_callback_owner'
const CALLBACK_OWNER_MAX_MS = 2 * 60 * 1000
const RESULT_MAX_AGE_MS = 5 * 60 * 1000

let tabInstanceId: string | null = null
let registeredAuxWindow: Window | null = null

/** เก็บ reference แท็บ access.line.me ที่ keeper เปิดด้วย window.open */
export function registerLineOAuthAuxWindow(win: Window | null): void {
  if (win && win !== window && !win.closed) {
    registeredAuxWindow = win
  }
}

/** ปิดแท็บ OAuth ที่เปิดจาก keeper (callback มักปิด opener ไม่ได้) */
export function closeLineOAuthAuxWindow(): void {
  const seen = new Set<Window>()
  const tryClose = (w: Window | null | undefined) => {
    if (!w || w === window || w.closed || seen.has(w)) return
    seen.add(w)
    try {
      w.close()
    } catch {
      /* ignore */
    }
  }

  const auxRef = registeredAuxWindow
  registeredAuxWindow = null
  tryClose(auxRef)

  if (!auxRef) return

  try {
    const named = window.open('', LINE_OAUTH_POPUP_WINDOW_NAME)
    tryClose(named)
  } catch {
    /* ignore */
  }
}

function getTabInstanceId(): string {
  if (!tabInstanceId) tabInstanceId = crypto.randomUUID()
  return tabInstanceId
}

export function isOAuthCallbackLocation(href = window.location.href): boolean {
  try {
    const params = new URL(href).searchParams
    return (
      params.has('code') ||
      params.has('line_connected') ||
      params.has('line_error') ||
      params.has('error')
    )
  } catch {
    return false
  }
}

function canHandoffOAuthCallbackToOpener(): boolean {
  const opener = window.opener
  if (!opener || opener.closed) return false
  try {
    return opener.location.origin === window.location.origin
  } catch {
    return false
  }
}

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
  | {
      type: 'close_aux'
      at: number
    }

function isOAuthResultPayload(
  payload: LineOAuthBroadcastPayload,
): payload is Extract<LineOAuthBroadcastPayload, { type: 'success' | 'error' }> {
  return payload.type === 'success' || payload.type === 'error'
}

/** สั่งให้แท็บ keeper ปิด access.line.me (เรียกจากแท็บ callback หลัง OAuth) */
export function requestCloseLineOAuthAuxWindow(): void {
  if (isLineOAuthKeeperTab() && !isOAuthCallbackLocation()) {
    closeLineOAuthAuxWindow()
  }

  const payload: LineOAuthBroadcastPayload = { type: 'close_aux', at: Date.now() }
  try {
    const channel = new BroadcastChannel(LINE_OAUTH_BROADCAST_CHANNEL)
    channel.postMessage(payload)
    channel.close()
  } catch {
    /* ignore */
  }
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

export function clearOAuthCallbackOwner(): void {
  try {
    sessionStorage.removeItem(LINE_OAUTH_CALLBACK_OWNER_KEY)
  } catch {
    /* ignore */
  }
}

export function closeLineOAuthPopupWindow(popupRef?: Window | null): void {
  if (!popupRef || popupRef === window || popupRef.closed) return
  try {
    popupRef.close()
  } catch {
    /* ignore */
  }
}

export function publishLineOAuthResult(payload: LineOAuthBroadcastPayload): void {
  if (!isOAuthResultPayload(payload)) return

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

  requestCloseLineOAuthAuxWindow()
}

export function readLineOAuthBroadcastResult(): LineOAuthBroadcastPayload | null {
  try {
    const raw = localStorage.getItem(LINE_OAUTH_RESULT_LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LineOAuthBroadcastPayload
    if (!parsed?.at || Date.now() - parsed.at > RESULT_MAX_AGE_MS) return null
    if (!isOAuthResultPayload(parsed)) return null
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
    if (data.type === 'close_aux' || isOAuthResultPayload(data)) handler(data)
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

/** ส่ง callback ไปแท็บ /contact เดิม (origin เดียวกัน) — ใช้เมื่อ opener เป็นแอปเรา */
function handoffOAuthCallbackToSameOriginOpener(): boolean {
  if (!isOAuthCallbackLocation() || !canHandoffOAuthCallbackToOpener()) return false

  const opener = window.opener!
  const target = window.location.href
  try {
    opener.location.replace(target)
    opener.focus()
  } catch {
    return false
  }

  window.setTimeout(() => {
    try {
      if (!opener.closed) opener.focus()
    } catch {
      /* ignore */
    }
    try {
      window.close()
    } catch {
      /* ignore */
    }
  }, 150)

  return true
}

export type OAuthCallbackTabRole = 'primary' | 'duplicate'

/** แท็บ callback — ข้ามถ้าแท็บอื่นแลก code แล้ว (ไม่ handoff ไป access.line.me) */
export function resolveOAuthCallbackTabRole(): OAuthCallbackTabRole {
  if (!isOAuthCallbackLocation()) return 'primary'

  if (isLineOAuthKeeperTab()) {
    return 'primary'
  }

  if (canHandoffOAuthCallbackToOpener()) {
    handoffOAuthCallbackToSameOriginOpener()
    return 'duplicate'
  }

  try {
    const existing = readLineOAuthBroadcastResult()
    if (existing && Date.now() - existing.at < 8000) {
      return 'duplicate'
    }

    const raw = sessionStorage.getItem(LINE_OAUTH_CALLBACK_OWNER_KEY)
    const now = Date.now()
    const selfId = getTabInstanceId()
    if (raw) {
      const parsed = JSON.parse(raw) as { t: number; id: string }
      if (now - parsed.t < CALLBACK_OWNER_MAX_MS && parsed.id !== selfId) {
        return 'duplicate'
      }
    }
    sessionStorage.setItem(
      LINE_OAUTH_CALLBACK_OWNER_KEY,
      JSON.stringify({ t: now, id: selfId }),
    )
  } catch {
    /* ignore */
  }

  return 'primary'
}

export function dismissDuplicateOAuthCallbackTab(): void {
  window.setTimeout(() => {
    try {
      window.close()
    } catch {
      /* ignore */
    }
    if (!window.closed) {
      const clean = new URL(window.location.href)
      clean.search = ''
      clean.hash = ''
      window.location.replace(clean.pathname)
    }
  }, 200)
}

/**
 * หลังแลก token — ปิดแท็บ callback และแท็บ access.line.me ที่ค้าง
 * แท็บ /contact (keeper) รับผลจาก broadcast
 */
export function finalizeOAuthCallbackTabs(): void {
  requestCloseLineOAuthAuxWindow()

  const opener = window.opener
  if (opener && !opener.closed) {
    try {
      if (canHandoffOAuthCallbackToOpener()) {
        const clean = new URL('/contact', window.location.origin)
        opener.location.replace(clean.href)
        opener.focus()
      } else {
        try {
          opener.close()
        } catch {
          /* ignore */
        }
      }
    } catch {
      try {
        opener.close()
      } catch {
        /* ignore */
      }
    }
  }

  dismissDuplicateOAuthCallbackTab()
}

/** @deprecated ใช้ finalizeOAuthCallbackTabs */
export function tryCloseLineOAuthCallbackTab(): void {
  finalizeOAuthCallbackTabs()
}

/** @deprecated */
export function redirectOAuthCallbackToOpener(): boolean {
  return handoffOAuthCallbackToSameOriginOpener()
}
