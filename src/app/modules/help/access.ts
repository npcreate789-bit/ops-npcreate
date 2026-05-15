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

export function helpNavItemsForRoles(roles: AppRole[]) {
  return navItemsForRoles(roles).filter(
    (item) => item.path !== '/app' && item.ready,
  )
}

export function helpShortcutsForRoles(roles: AppRole[]): HelpShortcut[] {
  const shortcuts: HelpShortcut[] = []

  if (canUseGlobalSearch(roles) || roles.length === 0) {
    shortcuts.push({
      keys: '⌘K / Ctrl+K',
      label: 'ค้นหาด่วน',
      detail: 'ค้นหา Lead · ลูกค้า · งาน',
    })
  }

  shortcuts.push({
    keys: '?',
    label: 'ช่วยเหลือ',
    detail: 'เปิดศูนย์ช่วยเหลือ',
  })

  shortcuts.push({
    keys: 'Esc',
    label: 'ปิด',
    detail: 'ปิด Command palette',
  })

  if (canUseQuickAccess(roles) || roles.length === 0) {
    shortcuts.push({
      keys: '☆',
      label: 'ปักหมุด',
      detail: 'ปักหมุดหน้าในศูนย์ช่วยเหลือ / หน้าหลัก',
    })
  }

  return shortcuts
}

export function helpQuickLinksForRoles(roles: AppRole[]) {
  const links: { path: string; label: string; detail: string }[] = []

  if (canViewWorkHub(roles) || roles.length === 0) {
    links.push({ path: '/app/work', label: 'งานของฉัน', detail: 'งานค้างและแจ้งเตือน' })
  }
  if (canViewTimeline(roles) || roles.length === 0) {
    links.push({ path: '/app/timeline', label: 'ไทม์ไลน์งาน', detail: 'ปฏิทินงานรวม' })
  }
  if (canUseGlobalSearch(roles) || roles.length === 0) {
    links.push({ path: '/app/search', label: 'ค้นหารวม', detail: 'ค้นหาทุกโมดูล' })
  }
  if (canViewOpsCenter(roles) || roles.length === 0) {
    links.push({ path: '/app/ops', label: 'ศูนย์ Ops', detail: 'เช็กลิสต์ deploy' })
  }

  return links.filter((link) => roles.length === 0 || canAccessNavPath(roles, link.path))
}
