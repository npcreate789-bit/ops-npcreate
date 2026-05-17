import {
  canAccessNavPath,
  effectiveRolesForNav,
  navItemsForRoles,
} from '../../config/navigation'
import type { AppRole } from '../../../shared/types/roles'

export interface NavSearchHit {
  id: string
  kind: 'nav'
  title: string
  subtitle: string | null
  href: string
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

/** ค้นหาเมนูที่ผู้ใช้เข้าถึงได้ — ไม่ต้องเรียก API */
export function searchAccessibleNav(
  roles: AppRole[],
  query: string,
  configured: boolean,
): NavSearchHit[] {
  const q = normalizeQuery(query)
  if (q.length < 2) return []

  const effective = effectiveRolesForNav(roles, configured)
  const items = navItemsForRoles(effective).filter(
    (item) => item.ready && item.path !== '/app' && canAccessNavPath(effective, item.path),
  )

  return items
    .filter(
      (item) =>
        item.labelTh.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q),
    )
    .slice(0, 6)
    .map((item) => ({
      id: item.path,
      kind: 'nav' as const,
      title: item.labelTh,
      subtitle: item.label !== item.labelTh ? item.label : null,
      href: item.path,
    }))
}

export function canOpenNavSearchResult(
  roles: AppRole[],
  href: string,
  configured: boolean,
): boolean {
  if (!configured) return true
  const effective = effectiveRolesForNav(roles, configured)
  if (effective.length === 0) return true
  return canAccessNavPath(effective, href)
}

export const NAV_SEARCH_KIND_LABEL = 'เมนู'
