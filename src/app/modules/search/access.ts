import { canAccessNavPath } from '../../config/navigation'
import { canUseGlobalSearch } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { SearchResult, SearchResultKind } from './types'

export type { SearchResultKind }

const KIND_PATH: Record<SearchResultKind, string> = {
  lead: '/app/crm',
  customer: '/app/customers',
  task: '/app/tasks',
}

export { canUseGlobalSearch }

export function searchKindsForRoles(roles: AppRole[]): SearchResultKind[] {
  if (roles.length === 0) return ['lead', 'customer', 'task']
  const kinds: SearchResultKind[] = []
  if (canAccessNavPath(roles, KIND_PATH.lead)) kinds.push('lead')
  if (canAccessNavPath(roles, KIND_PATH.customer)) kinds.push('customer')
  if (canAccessNavPath(roles, KIND_PATH.task)) kinds.push('task')
  return kinds
}

export function hasGlobalSearchKinds(roles: AppRole[]): boolean {
  return searchKindsForRoles(roles).length > 0
}

export function isGlobalSearchScoped(roles: AppRole[]): boolean {
  if (roles.length === 0) return false
  return searchKindsForRoles(roles).length < 3
}

export function searchKindNavPath(kind: SearchResultKind): string {
  return KIND_PATH[kind]
}

/** เปิดลิงก์ผลค้นหาได้เมื่อเข้าเมนูโมดูลนั้นได้ (สอดคล้อง RLS + nav) */
export function canOpenSearchResult(roles: AppRole[], href: string): boolean {
  if (roles.length === 0) return true
  const base = href.match(/^\/app\/[^/]+/)?.[0]
  if (!base) return false
  return canAccessNavPath(roles, base)
}

export function filterVisibleSearchResults(
  results: SearchResult[],
  roles: AppRole[],
): SearchResult[] {
  const kinds = new Set(searchKindsForRoles(roles))
  return results.filter(
    (r) => kinds.has(r.kind) && canOpenSearchResult(roles, r.href),
  )
}

export function scopedSearchKindLabels(
  roles: AppRole[],
  labelFn: (kind: SearchResultKind) => string,
): string {
  return searchKindsForRoles(roles).map(labelFn).join(' · ')
}
