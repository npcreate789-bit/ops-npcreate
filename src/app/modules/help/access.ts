export { canViewHelp } from '../../../shared/auth/access'

import { canAccessNavPath, effectiveRolesForNav, sidebarNavItemsForRoles } from '../../config/navigation'
import {
  canUseGlobalSearch,
  canUseQuickAccess,
  canViewOpsCenter,
  canViewSystemStatus,
  canViewWorkHub,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { HelpShortcut } from './types'

const HELP_SELF_PATH = '/app/help'

function isDevUnconfigured(roles: AppRole[], configured: boolean): boolean {
  return !configured && effectiveRolesForNav(roles, configured).length > 0 && roles.length === 0
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

/** เมนูงานจริงในแถบข้าง (ไม่รวมหน้าที่ยุบแล้ว) */
export function helpNavItemsForRoles(roles: AppRole[], configured: boolean) {
  const effectiveRoles = effectiveRolesForNav(roles, configured)

  return sidebarNavItemsForRoles(effectiveRoles).filter(
    (item) => item.path !== '/app' && item.path !== HELP_SELF_PATH && item.ready,
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
      keys: '↑ ↓ · Enter',
      label: 'เลือกผลค้นหา',
      detail: 'ใน Command palette เมื่อมีผล',
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
  if (canUseGlobalSearch(roles) || devMode) {
    links.push({ path: '/app/search', label: 'ค้นหารวม (หน้าเต็ม)', detail: 'หรือกด ⌘K จากทุกหน้า' })
  }
  if (canViewOpsCenter(roles) || devMode) {
    links.push({ path: '/app/ops', label: 'ศูนย์ Ops', detail: 'เช็กลิสต์ deploy' })
  }
  if (canViewSystemStatus(roles) || devMode) {
    links.push({ path: '/app/status', label: 'สถานะระบบ', detail: 'ตรวจ Supabase · เวอร์ชันแอป' })
  }

  return links.filter((link) => canOpenHelpNavLink(roles, link.path, configured))
}

const FLOW_STAFF = [
  'Lead ใน CRM → ใบเสนอราคา (/app/sales) → ลูกค้าเปิดลิงก์ยอมรับ',
  'Finance ยืนยันชำระ → ลูกค้ากรอกบรีฟ → Account ตรวจ checklist ที่ /app/onboarding',
  'ปิดการขาย → Admin บันทึกชำระเงิน',
  'ลูกค้ากรอกบรีฟใน Client Workspace → Account ตรวจในรับบรีฟ',
  'แชทลูกค้าและบรีฟค้างปรากฏในงานของฉัน (/app/work)',
  'Ads + Content ดำเนินงาน · รายงานใน Client Workspace',
] as const

const FLOW_CLIENT = [
  'ดูสถานะชำระเงินและเอกสารในเมนูการชำระเงิน — แจ้งสลิปผ่านแชท',
  'กรอกบรีฟงานให้ครบ — เมนูบรีฟใน Client Workspace',
  'แชทกับทีม NP Create — ทีมจะเห็นในศูนย์งานของฉัน',
  'ดูรายงานผลโฆษณาและสรุปรายเดือนในเมนูรายงาน',
] as const

export function helpFlowStepsForRoles(roles: AppRole[], configured: boolean): string[] {
  const effective = effectiveRolesForNav(roles, configured)
  if (effective.length === 0) return [...FLOW_STAFF]
  if (effective.every((r) => r === 'client')) return [...FLOW_CLIENT]
  return [...FLOW_STAFF]
}
