import type { AppRole } from '../../../shared/types/roles'

/** ชื่อบทบาทภาษาไทย — แสดงในหน้าตั้งค่าเท่านั้น */
export const SETTINGS_ROLE_LABELS_TH: Record<AppRole, string> = {
  ceo: 'ผู้บริหาร (CEO)',
  operations: 'ปฏิบัติการ',
  sales: 'ขาย',
  account: 'บัญชีลูกค้า / Account',
  ads: 'ยิงแอด',
  senior_ads: 'หัวหน้ายิงแอด',
  content: 'คอนเทนต์ / ครีเอทีฟ',
  admin: 'การเงิน / Admin',
  dev: 'พัฒนาระบบ',
  client: 'ลูกค้า (พอร์ทัล)',
}

export function labelSettingsRole(role: AppRole): string {
  return SETTINGS_ROLE_LABELS_TH[role] ?? role
}

export function labelAccountBackend(configured: boolean): string {
  return configured ? 'เชื่อม Supabase แล้ว' : 'โหมดพัฒนา (ยังไม่ตั้งค่า env)'
}

export function labelDisplayName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim()
  if (!trimmed) return 'ยังไม่ได้ตั้งชื่อ'
  return trimmed
}
