import { canAccessNavPath } from '../../config/navigation'
import { canAccessNotifications, canViewWorkHub } from '../../../shared/auth/access'
import { canShowTimelineKind } from '../timeline/access'
import type { AppRole } from '../../../shared/types/roles'
import { WORK_KIND_OPTIONS } from './constants'
import type { WorkItem, WorkItemKind } from './types'

export { canViewWorkHub }

export function canShowWorkKind(roles: AppRole[], kind: WorkItemKind): boolean {
  if (roles.length === 0) return true
  if (kind === 'notification') {
    return canAccessNotifications(roles)
  }
  return canShowTimelineKind(roles, kind)
}

export function workKindsForRoles(roles: AppRole[]): WorkItemKind[] {
  return WORK_KIND_OPTIONS.filter((o) => o.value !== '')
    .map((o) => o.value as WorkItemKind)
    .filter((k) => canShowWorkKind(roles, k))
}

export function hasWorkHubKinds(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return workKindsForRoles(roles).length > 0
}

export function workKindOptionsForRoles(roles: AppRole[]) {
  const allowed = new Set(workKindsForRoles(roles))
  return WORK_KIND_OPTIONS.filter((o) => !o.value || allowed.has(o.value as WorkItemKind))
}

export function isWorkHubScoped(roles: AppRole[]): boolean {
  if (roles.length === 0) return false
  const kinds = workKindsForRoles(roles)
  const total = WORK_KIND_OPTIONS.filter((o) => o.value !== '').length
  return kinds.length > 0 && kinds.length < total
}

export function canOpenWorkItemLink(roles: AppRole[], href: string): boolean {
  if (roles.length === 0) return true
  const base = href.match(/^\/app\/[^/]+/)?.[0]
  if (!base) return false
  return canAccessNavPath(roles, base)
}

/** กรองตามประเภท — แจ้งเตือนยังแสดงแม้ลิงก์ปลายทางไม่มีสิทธิ์ (UI แสดง locked) */
export function filterVisibleWorkItems(
  items: WorkItem[],
  roles: AppRole[],
  configured = false,
): WorkItem[] {
  if (roles.length === 0) {
    return configured ? [] : items
  }
  return items.filter((item) => {
    if (!canShowWorkKind(roles, item.kind)) return false
    if (item.kind === 'notification') return true
    return canOpenWorkItemLink(roles, item.link)
  })
}

export function scopedWorkKindLabels(
  roles: AppRole[],
  labelFn: (kind: WorkItemKind) => string,
): string {
  return workKindsForRoles(roles).map(labelFn).join(' · ')
}
