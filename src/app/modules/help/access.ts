export { canViewHelp } from '../../../shared/auth/access'

import { canAccessNavPath, effectiveRolesForNav, sidebarNavItemsForRoles } from '../../config/navigation'
import {
  canManageAdminUsers,
  canUseGlobalSearch,
  canUseQuickAccess,
  canViewOpsCenter,
  canViewSystemStatus,
  canViewWorkHub,
  hasClientPortalStaffPreview,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { HelpShortcut } from './types'

const HELP_SELF_PATH = '/app/help'

export interface HelpRelatedLink {
  path: string
  label: string
  hint: string
}

function isDevUnconfigured(roles: AppRole[], configured: boolean): boolean {
  return !configured && effectiveRolesForNav(roles, configured).length > 0 && roles.length === 0
}

function helpDevMode(roles: AppRole[], configured: boolean): boolean {
  return isDevUnconfigured(roles, configured)
}

export function canOpenHelpNavLink(
  roles: AppRole[],
  path: string,
  configured: boolean,
): boolean {
  if (helpDevMode(roles, configured)) return true
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
  const devMode = helpDevMode(roles, configured)
  const shortcuts: HelpShortcut[] = []

  if (canUseGlobalSearch(roles) || devMode) {
    shortcuts.push({
      keys: '⌘K / Ctrl+K',
      label: 'ค้นหาด่วน',
      detail: 'ค้นหาลูกค้าเป้าหมาย · ลูกค้า · งาน · เมนู',
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

/** ลิงก์ข้ามโมดูล — กรองตามสิทธิ์จริง */
export function helpRelatedLinksForRoles(
  roles: AppRole[],
  configured: boolean,
): HelpRelatedLink[] {
  const effective = effectiveRolesForNav(roles, configured)
  const devMode = helpDevMode(roles, configured)
  const isClientOnly =
    effective.length > 0 && effective.every((r) => r === 'client')

  const candidates: HelpRelatedLink[] = [
    {
      path: '/app/settings',
      label: 'ตั้งค่า',
      hint: 'ชื่อที่แสดงและพับเมนู',
    },
    {
      path: '/app/work',
      label: 'งานของฉัน',
      hint: 'งานค้างและแจ้งเตือน',
    },
    {
      path: '/app/client',
      label: 'พื้นที่ลูกค้า',
      hint: isClientOnly ? 'งานและรายงานของแบรนด์' : 'ตัวอย่างหน้าที่ลูกค้าเห็น',
    },
    {
      path: '/app/search',
      label: 'ค้นหารวม',
      hint: 'หรือกด ⌘K จากทุกหน้า',
    },
    {
      path: '/app/status',
      label: 'สถานะระบบ',
      hint: 'ตรวจ Supabase และโดเมน',
    },
    {
      path: '/app/ops',
      label: 'ศูนย์ Ops',
      hint: 'เช็กลิสต์ก่อน deploy',
    },
    {
      path: '/app/admin',
      label: 'ผู้ดูแลระบบ',
      hint: 'สร้างบัญชี · มอบบทบาท',
    },
    {
      path: '/app/about',
      label: 'เกี่ยวกับ',
      hint: 'เวอร์ชันแอป',
    },
  ]

  return candidates.filter((link) => {
    if (link.path === '/app/work') {
      return canViewWorkHub(effective) || devMode
    }
    if (link.path === '/app/search') {
      return canUseGlobalSearch(effective) || devMode
    }
    if (link.path === '/app/status') {
      return canViewSystemStatus(effective) || devMode
    }
    if (link.path === '/app/ops') {
      return canViewOpsCenter(effective) || devMode
    }
    if (link.path === '/app/admin') {
      return canManageAdminUsers(effective) || devMode
    }
    if (link.path === '/app/client') {
      return (
        isClientOnly ||
        hasClientPortalStaffPreview(effective) ||
        canAccessNavPath(effective, link.path) ||
        devMode
      )
    }
    return canOpenHelpNavLink(effective, link.path, configured) || devMode
  })
}

/** @deprecated ใช้ helpRelatedLinksForRoles แทน */
export function helpQuickLinksForRoles(roles: AppRole[], configured: boolean) {
  return helpRelatedLinksForRoles(roles, configured).map((link) => ({
    path: link.path,
    label: link.label,
    detail: link.hint,
  }))
}
