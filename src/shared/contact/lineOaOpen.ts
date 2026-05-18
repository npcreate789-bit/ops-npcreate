import { isMobileBrowser } from '../line/lineStaffOpenUrl'

/** รอสั้นๆ ก่อน fallback — ถ้าแอป LINE เปิดแล้ว visibility จะเป็น hidden */
const LINE_APP_OPEN_FALLBACK_MS = 900

/**
 * แปลง https://line.me/R/oaMessage/... เป็น line://oaMessage/... (ไม่มี /R/)
 * รูปแบบ line://R/oaMessage เดิมทำให้ LINE แจ้ง "ไม่สามารถเชื่อมต่อได้"
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

/** Android: เปิดแอป LINE โดยตรง ไม่ผ่านหน้า line.me */
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

function assignWithHttpsFallback(primaryUrl: string, httpsFallback: string): void {
  window.location.assign(primaryUrl)
  window.setTimeout(() => {
    if (document.visibilityState === 'visible') {
      window.location.assign(httpsFallback)
    }
  }, LINE_APP_OPEN_FALLBACK_MS)
}

/**
 * เปิดแชท OA พร้อมข้อความ
 * - มือถือ: พยายามเปิดแอป LINE โดยตรง (intent / line://) ไม่ค้างหน้า line.me
 * - เดสก์ท็อป: แท็บใหม่
 */
export function openLineOaMessageLink(httpsUrl: string): void {
  const target = httpsUrl.trim()
  if (!target) return

  if (!isMobileBrowser()) {
    window.open(target, '_blank', 'noopener,noreferrer')
    return
  }

  const intent = androidIntentForLineHttps(target)
  if (intent) {
    assignWithHttpsFallback(intent, target)
    return
  }

  const appScheme = lineOaAppSchemeFromHttps(target)
  if (appScheme) {
    assignWithHttpsFallback(appScheme, target)
    return
  }

  window.location.assign(target)
}
