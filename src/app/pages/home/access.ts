import { isClientOnlyAccount } from '../../../shared/auth/postLoginPath'
import { BANGKOK_TZ } from '../../../shared/dates/bangkok'
import type { AppRole } from '../../../shared/types/roles'
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
