import { isMobileBrowser } from '../line/lineStaffOpenUrl'

/** รอสั้นๆ ก่อน fallback — ถ้าแอป LINE เปิดแล้ว visibility จะเป็น hidden */
const LINE_APP_OPEN_FALLBACK_MS = 900

/** รอให้ LINE เปิดก่อนปิดแท็บเบราว์เซอร์ */
const HANDOFF_WINDOW_CLOSE_MS = 1400

const CONTACT_EXIT_URL = 'https://npcreate.co.th/'

/**
 * แปลง https://line.me/R/oaMessage/... เป็น line://oaMessage/... (ไม่มี /R/)
 */
export function lineOaAppSchemeFromHttps(httpsUrl: string): string | null {
  try {
    const parsed = new URL(httpsUrl)
    if (!parsed.hostname.endsWith('line.me')) return null
    const segments = parsed.pathname.split('/').filter(Boolean)
    const idx = segments.indexOf('oaMessage')
    if (idx < 0 || !segments[idx + 1]) return null
    const oaId = decodeURIComponent(segments[idx + 1])
    const suffix = parsed.search || ''
    return `line://oaMessage/${oaId}/${suffix}`
  } catch {
    return null
  }
}

export function androidIntentForLineHttps(httpsUrl: string): string | null {
  if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent)) {
    return null
  }
  try {
    const parsed = new URL(httpsUrl)
    const intentPath = `${parsed.host}${parsed.pathname}${parsed.search}`
    return (
      `intent://${intentPath}#Intent;` +
      'scheme=https;' +
      'package=jp.naver.line.android;' +
      `S.browser_fallback_url=${encodeURIComponent(httpsUrl)};` +
      'end'
    )
  } catch {
    return null
  }
}

/** เปิดแท็บว่างทันที (ก่อน await) เพื่อไม่โดน popup blocker */
export function openLineHandoffPopup(): Window | null {
  if (typeof window === 'undefined') return null
  try {
    return window.open('about:blank', 'npc_line_handoff', 'noopener,noreferrer')
  } catch {
    return null
  }
}

function navigateHandoffWindow(win: Window, url: string): void {
  try {
    win.location.replace(url)
  } catch {
    win.location.href = url
  }
}

function openInHandoffWindow(
  handoffWindow: Window | null,
  httpsUrl: string,
  primaryUrl: string | null,
): boolean {
  if (!handoffWindow || handoffWindow.closed) return false
  const first = primaryUrl ?? httpsUrl
  navigateHandoffWindow(handoffWindow, first)
  if (primaryUrl && primaryUrl !== httpsUrl) {
    window.setTimeout(() => {
      if (handoffWindow.closed) return
      try {
        if (handoffWindow.document.visibilityState === 'visible') {
          navigateHandoffWindow(handoffWindow, httpsUrl)
        }
      } catch {
        try {
          handoffWindow.close()
        } catch {
          /* cross-origin */
        }
      }
    }, LINE_APP_OPEN_FALLBACK_MS)
  }
  return true
}

function openOnCurrentTab(httpsUrl: string, primaryUrl: string | null): void {
  const first = primaryUrl ?? httpsUrl
  window.location.assign(first)
  if (primaryUrl && primaryUrl !== httpsUrl) {
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.assign(httpsUrl)
      }
    }, LINE_APP_OPEN_FALLBACK_MS)
  }
}

/**
 * เปิดแชท OA — ใช้ handoffWindow ถ้ามี (ไม่พา /contact ไป line.me)
 */
export function openLineOaMessageLink(
  httpsUrl: string,
  handoffWindow: Window | null = null,
): void {
  const target = httpsUrl.trim()
  if (!target) return

  const mobile = isMobileBrowser()
  const primary =
    (mobile ? androidIntentForLineHttps(target) : null) ??
    (mobile ? lineOaAppSchemeFromHttps(target) : null)

  if (handoffWindow && !handoffWindow.closed) {
    openInHandoffWindow(handoffWindow, target, primary)
    return
  }

  if (!mobile) {
    const win = window.open(target, 'npc_line_handoff', 'noopener,noreferrer')
    if (win) return
  }

  if (mobile && primary) {
    openOnCurrentTab(target, primary)
    return
  }

  if (mobile) {
    window.location.assign(target)
    return
  }

  window.open(target, '_blank', 'noopener,noreferrer')
}

/**
 * ปิดแท็บ line.me / about:blank และออกจาก /contact หลังส่งฟอร์ม
 */
export function scheduleContactHandoffWindowClose(handoffWindow: Window | null): void {
  window.setTimeout(() => {
    try {
      handoffWindow?.close()
    } catch {
      /* ignore */
    }

    let closed = false
    try {
      window.close()
      closed = window.closed
    } catch {
      /* ignore */
    }

    if (!closed && typeof window !== 'undefined' && window.location.pathname.includes('/contact')) {
      window.location.replace(CONTACT_EXIT_URL)
    }
  }, HANDOFF_WINDOW_CLOSE_MS)
}
