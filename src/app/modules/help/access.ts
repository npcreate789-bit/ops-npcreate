export { canViewHelp } from '../../../shared/auth/access'

import { canAccessNavPath, navItemsForRoles } from '../../config/navigation'
import {
  canUseGlobalSearch,
  canUseQuickAccess,
  canViewOpsCenter,
  canViewTimeline,
  canViewWorkHub,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { HelpShortcut } from './types'

const HELP_SELF_PATH = '/app/help'

function isDevUnconfigured(roles: AppRole[], configured: boolean): boolean {
  return !configured && roles.length === 0
}

export function canOpenHelpNavLink(
  roles: AppRole[],
  path: string,
  configured: boolean,
): boolean {
  if (isDevUnconfigured(roles, configured)) return true
  if (roles.length === 0) return false
  return canAccessNavPath(roles, path)
}

export function helpNavItemsForRoles(roles: AppRole[], configured: boolean) {
  const effectiveRoles =
    roles.length > 0 ? roles : isDevUnconfigured(roles, configured) ? (['ceo' as const] as AppRole[]) : []

  return navItemsForRoles(effectiveRoles).filter(
    (item) =>
      item.path !== '/app' &&
      item.path !== HELP_SELF_PATH &&
      item.ready,
  )
}

export function helpShortcutsForRoles(roles: AppRole[], configured: boolean): HelpShortcut[] {
  const devMode = isDevUnconfigured(roles, configured)
  const shortcuts: HelpShortcut[] = []

  if (canUseGlobalSearch(roles) || devMode) {
    shortcuts.push({
      keys: '⌘K / Ctrl+K',
      label: 'ค้นหาด่วน',
      detail: 'ค้นหา Lead · ลูกค้า · งาน',
    })
    shortcuts.push({
      keys: 'Esc',
      label: 'ปิด',
      detail: 'ปิด Command palette',
    })
  }

  shortcuts.push({
    keys: '?',
    label: 'ช่วยเหลือ',
    detail: 'เปิดศูนย์ช่วยเหลือ (หน้านี้)',
  })

  if (canUseQuickAccess(roles) || devMode) {
    shortcuts.push({
      keys: '☆',
      label: 'ปักหมุด',
      detail: 'ปักหมุดในหน้าหลักหรือใน ⌘K',
    })
  }

  return shortcuts
}

export function helpQuickLinksForRoles(roles: AppRole[], configured: boolean) {
  const devMode = isDevUnconfigured(roles, configured)
  const links: { path: string; label: string; detail: string }[] = []

  if (canViewWorkHub(roles) || devMode) {
    links.push({ path: '/app/work', label: 'งานของฉัน', detail: 'งานค้างและแจ้งเตือน' })
  }
  if (canViewTimeline(roles) || devMode) {
    links.push({ path: '/app/timeline', label: 'ไทม์ไลน์งาน', detail: 'ปฏิทินงานรวม' })
  }
  if (canUseGlobalSearch(roles) || devMode) {
    links.push({ path: '/app/search', label: 'ค้นหารวม', detail: 'ค้นหาทุกโมดูล' })
  }
  if (canViewOpsCenter(roles) || devMode) {
    links.push({ path: '/app/ops', label: 'ศูนย์ Ops', detail: 'เช็กลิสต์ deploy' })
  }

  return links.filter((link) => canOpenHelpNavLink(roles, link.path, configured))
}

const FLOW_STAFF = [
  'Lead ลูกค้าใหม่ (CRM)',
  'Sales เสนอแพ็กเกจ / ใบเสนอราคา',
  'ปิดการขาย → Admin บันทึกชำระเงิน',
  'Account รับบรีฟ (Onboarding)',
  'Ads + Content ดำเนินงาน',
  'รายงานลูกค้า → CEO ดูภาพรวม',
] as const

const FLOW_CLIENT = [
  'เปิดรายงานลูกค้าของคุณในเมนูรายงานลูกค้า',
  'ใช้ผู้ช่วย AI ในหน้ารายงาน (ถามข้อมูลของคุณเท่านั้น)',
] as const

export function helpFlowStepsForRoles(roles: AppRole[]): string[] {
  if (roles.length === 0) return [...FLOW_STAFF]
  if (roles.every((r) => r === 'client')) return [...FLOW_CLIENT]
  return [...FLOW_STAFF]
}
