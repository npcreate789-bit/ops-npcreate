/** โดเมนหลักของแอป (production) — ตั้งใน Vercel เป็น VITE_APP_URL */
const DEFAULT_APP_ORIGIN = 'https://app.npcreate.co.th'

function normalizeOrigin(value: string | undefined): string {
  if (!value?.trim()) return DEFAULT_APP_ORIGIN
  return value.trim().replace(/\/$/, '')
}

export const APP_CANONICAL_ORIGIN = normalizeOrigin(import.meta.env.VITE_APP_URL)

export const APP_CANONICAL_HOST = (() => {
  try {
    return new URL(APP_CANONICAL_ORIGIN).hostname
  } catch {
    return 'app.npcreate.co.th'
  }
})()

/** origin ปัจจุบันในเบราว์เซอร์ หรือ canonical เมื่อรันนอก browser */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return APP_CANONICAL_ORIGIN
}

export function appUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getAppOrigin()}${normalized}`
}

export function isCanonicalProductionHost(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname === APP_CANONICAL_HOST
}

export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return import.meta.env.DEV
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
}

/** ข้อความแสดงบนหน้า login / status */
export function appHostLabel(): string {
  if (typeof window === 'undefined') return APP_CANONICAL_HOST
  if (isLocalDevHost()) return `${window.location.host} (พัฒนาในเครื่อง)`
  if (isCanonicalProductionHost()) return APP_CANONICAL_HOST
  return window.location.host
}
