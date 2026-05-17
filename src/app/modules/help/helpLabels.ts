import type { AppRole } from '../../../shared/types/roles'
import { labelSettingsRole } from '../settings/settingsLabels'

export function labelHelpRoles(roles: AppRole[]): string {
  if (roles.length === 0) return '—'
  return roles.map((r) => labelSettingsRole(r)).join(' · ')
}

export function labelFlowSectionTitle(isClientOnly: boolean): string {
  return isClientOnly ? 'เริ่มต้นสำหรับลูกค้า' : 'Flow งานหลัก (ทีม)'
}

export function labelModulesSection(): string {
  return 'เมนูที่คุณเข้าได้'
}
