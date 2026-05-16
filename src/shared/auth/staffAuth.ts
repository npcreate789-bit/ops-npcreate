import { normalizeLoginId } from './loginId'

/** โดเมนอีเมลภายในสำหรับ Supabase Auth (ผู้ใช้ login ด้วย login_id ไม่ใช่อีเมลนี้) */
export const STAFF_AUTH_EMAIL_DOMAIN = 'npcreate.local'

export function staffAuthEmail(loginId: string): string {
  return `${normalizeLoginId(loginId)}@${STAFF_AUTH_EMAIL_DOMAIN}`
}
