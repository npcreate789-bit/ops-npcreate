import {
  canViewFinanceDocuments,
  canViewRenewals,
  hasCrmTeamView,
  hasDbPrivilegedRole,
  hasNavFullAccess,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { TIMELINE_KIND_OPTIONS } from './constants'
import type { TimelineKind } from './types'

export function canShowTimelineKind(roles: AppRole[], kind: TimelineKind): boolean {
  if (roles.length === 0) return true
  if (hasNavFullAccess(roles) || hasDbPrivilegedRole(roles)) return true

  switch (kind) {
    case 'task':
      return true
    case 'contract_end':
      return canViewRenewals(roles)
    case 'lead_reminder':
      return hasCrmTeamView(roles) || roles.includes('sales')
    case 'payment_due':
      return canViewFinanceDocuments(roles)
    default:
      return false
  }
}

export function timelineKindsForRoles(roles: AppRole[]): TimelineKind[] {
  return TIMELINE_KIND_OPTIONS.filter((o) => o.value !== '').map((o) => o.value as TimelineKind).filter(
    (k) => canShowTimelineKind(roles, k),
  )
}

export function timelineKindOptionsForRoles(roles: AppRole[]) {
  const allowed = new Set(timelineKindsForRoles(roles))
  return TIMELINE_KIND_OPTIONS.filter((o) => !o.value || allowed.has(o.value as TimelineKind))
}

export function isTimelineScoped(roles: AppRole[]): boolean {
  if (roles.length === 0) return false
  const kinds = timelineKindsForRoles(roles)
  const total = TIMELINE_KIND_OPTIONS.filter((o) => o.value !== '').length
  return kinds.length > 0 && kinds.length < total
}
