import { isClientOnlyAccount } from '../../../shared/auth/postLoginPath'
import type { AppRole } from '../../../shared/types/roles'
import { BANGKOK_TZ } from '../../../shared/dates/bangkok'
import { canAccessNavPath, sidebarNavItemsForRoles, type NavItem } from '../../config/navigation'
import { helpNavItemsForRoles } from '../../modules/help/access'
import {
  HOME_CLIENT_PRIORITY_PATHS,
  HOME_MODULE_GRID_LIMIT,
  HOME_PRIORITY_LIMIT,
  HOME_PRIORITY_PATHS,
} from './constants'

export function isClientOnlyHome(roles: AppRole[], configured: boolean): boolean {
  return configured && isClientOnlyAccount(roles)
}

export function bangkokGreeting(base = new Date()): string {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BANGKOK_TZ,
      hour: 'numeric',
      hour12: false,
    }).format(base),
    10,
  )
  if (hour < 12) return 'สวัสดีตอนเช้า'
  if (hour < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

export function homeModulesForRoles(roles: AppRole[], configured: boolean): NavItem[] {
  return helpNavItemsForRoles(roles, configured).slice(0, HOME_MODULE_GRID_LIMIT)
}

export function homeAllModuleCount(roles: AppRole[], configured: boolean): number {
  return helpNavItemsForRoles(roles, configured).length
}

export function homePriorityActions(
  roles: AppRole[],
  clientOnly: boolean,
): NavItem[] {
  const byPath = new Map(
    sidebarNavItemsForRoles(roles)
      .filter((i) => i.path !== '/app' && i.ready)
      .map((i) => [i.path, i] as const),
  )
  const order = clientOnly ? HOME_CLIENT_PRIORITY_PATHS : HOME_PRIORITY_PATHS
  const picked: NavItem[] = []
  for (const path of order) {
    const item = byPath.get(path)
    if (item) picked.push(item)
    if (picked.length >= HOME_PRIORITY_LIMIT) break
  }
  return picked
}

export function canOpenHomePath(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return true
  return canAccessNavPath(roles, path)
}

/** แสดงรายการลูกค้าที่ส่งฟอร์ม /contact บนหน้าหลัก */
export function canViewHomeContactInquiries(roles: AppRole[], configured: boolean): boolean {
  if (!configured) return true
  if (roles.length === 0) return false
  if (isClientOnlyAccount(roles)) return false
  return canAccessNavPath(roles, '/app/crm')
}

export function homeLeadDetailLink(
  roles: AppRole[],
  leadId: string,
): { to: string; linkable: boolean; lockedLabel: string } {
  const detail = `/app/crm/${leadId}`
  if (canOpenHomePath(roles, '/app/crm')) {
    return { to: detail, linkable: true, lockedLabel: '' }
  }
  if (canOpenHomePath(roles, '/app/sales')) {
    return {
      to: '/app/sales',
      linkable: true,
      lockedLabel: 'เปิดใน Sales — ไม่มีสิทธิ์ CRM',
    }
  }
  return {
    to: detail,
    linkable: false,
    lockedLabel: 'ไม่มีสิทธิ์เปิดรายละเอียด Lead',
  }
}
