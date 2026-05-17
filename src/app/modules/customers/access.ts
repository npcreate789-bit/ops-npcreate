import { canAccessNavPath } from '../../config/navigation'
import {
  canViewActivityLog,
  canViewRenewals,
  canViewReportFinanceMetrics,
  hasContentTeamView,
  hasDbPrivilegedRole,
  hasNavFullAccess,
} from '../../../shared/auth/access'
import { canViewWeeklyAdsMetrics } from '../weekly/access'
import { CUSTOMER_TIMELINE_KIND_OPTIONS } from './constants'
import type { AppRole } from '../../../shared/types/roles'
import type { CustomerTimelineKind } from './types'

export { canViewCustomer360 } from '../../../shared/auth/access'

export type Customer360MetricKey = 'finance' | 'ads' | 'tasks' | 'content' | 'renewals'

export function canShowCustomer360Link(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return true
  return canAccessNavPath(roles, path)
}

export function canShowCustomer360FinanceMetrics(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return canViewReportFinanceMetrics(roles) || canShowCustomer360Link(roles, '/app/finance')
}

export function canShowCustomer360AdsMetrics(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return canViewWeeklyAdsMetrics(roles)
}

export function canShowCustomer360ContentMetrics(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return hasContentTeamView(roles) || canShowCustomer360Link(roles, '/app/content')
}

export function customer360MetricKeysForRoles(roles: AppRole[]): Customer360MetricKey[] {
  if (roles.length === 0) {
    return ['finance', 'ads', 'tasks', 'content', 'renewals']
  }
  if (hasNavFullAccess(roles) || hasDbPrivilegedRole(roles)) {
    return ['finance', 'ads', 'tasks', 'content', 'renewals']
  }
  const keys: Customer360MetricKey[] = ['tasks']
  if (canShowCustomer360FinanceMetrics(roles)) keys.unshift('finance')
  if (canShowCustomer360AdsMetrics(roles)) keys.push('ads')
  if (canShowCustomer360ContentMetrics(roles)) keys.push('content')
  if (canViewRenewals(roles)) keys.push('renewals')
  return keys
}

export function isCustomer360Scoped(roles: AppRole[]): boolean {
  if (roles.length === 0) return false
  const keys = customer360MetricKeysForRoles(roles)
  return keys.length > 0 && keys.length < 5
}

/** @deprecated ใช้ canShowCustomer360Link(roles, '/app/finance') */
export function canLinkCustomerFinance(roles: AppRole[]): boolean {
  return canShowCustomer360Link(roles, '/app/finance')
}

export function canLinkCustomerRenewals(roles: AppRole[]): boolean {
  return canViewRenewals(roles) && canShowCustomer360Link(roles, '/app/renewals')
}

export function canLinkCustomerAds(roles: AppRole[]): boolean {
  return canShowCustomer360AdsMetrics(roles)
}

export function canLinkCustomerOnboarding(roles: AppRole[]): boolean {
  return canShowCustomer360Link(roles, '/app/onboarding')
}

export function canLinkCustomerClient(roles: AppRole[]): boolean {
  return canShowCustomer360Link(roles, '/app/client')
}

export function canLinkCustomerChat(roles: AppRole[]): boolean {
  return canShowCustomer360Link(roles, '/app/chat')
}

export function canLinkCustomerCrm(roles: AppRole[]): boolean {
  return canShowCustomer360Link(roles, '/app/crm')
}

export function canShowCustomer360TimelineKind(
  roles: AppRole[],
  kind: CustomerTimelineKind,
): boolean {
  if (roles.length === 0) return true
  if (hasNavFullAccess(roles) || hasDbPrivilegedRole(roles)) return true

  switch (kind) {
    case 'task':
      return canShowCustomer360Link(roles, '/app/tasks')
    case 'payment':
      return canShowCustomer360FinanceMetrics(roles)
    case 'content':
      return canShowCustomer360ContentMetrics(roles)
    case 'contract':
      return canLinkCustomerRenewals(roles)
    case 'activity':
      return canViewActivityLog(roles)
    case 'lead':
      return canLinkCustomerCrm(roles)
    default:
      return false
  }
}

export function customer360TimelineKindsForRoles(roles: AppRole[]): CustomerTimelineKind[] {
  return CUSTOMER_TIMELINE_KIND_OPTIONS.filter((o) => o.value !== '').map(
    (o) => o.value as CustomerTimelineKind,
  ).filter((k) => canShowCustomer360TimelineKind(roles, k))
}

export function customer360TimelineKindsForContext(
  roles: AppRole[],
  leadId: string | null,
): CustomerTimelineKind[] {
  return customer360TimelineKindsForRoles(roles).filter(
    (k) => k !== 'lead' || Boolean(leadId),
  )
}

export function hasCustomer360TimelineKinds(
  roles: AppRole[],
  leadId: string | null,
): boolean {
  return customer360TimelineKindsForContext(roles, leadId).length > 0
}

export function isCustomer360TimelineScoped(
  roles: AppRole[],
  leadId: string | null = null,
): boolean {
  if (roles.length === 0) return false
  const kinds = customer360TimelineKindsForContext(roles, leadId)
  const total = CUSTOMER_TIMELINE_KIND_OPTIONS.filter((o) => o.value !== '')
    .map((o) => o.value as CustomerTimelineKind)
    .filter((k) => k !== 'lead' || Boolean(leadId)).length
  return kinds.length > 0 && kinds.length < total
}

export function canOpenCustomerTimelineLink(roles: AppRole[], href: string): boolean {
  if (roles.length === 0) return true
  const base = href.match(/^\/app\/[^/]+/)?.[0]
  if (!base) return false
  return canAccessNavPath(roles, base)
}

export function filterVisibleCustomerTimelineEntries<
  T extends { kind: CustomerTimelineKind },
>(entries: T[], roles: AppRole[], leadId: string | null): T[] {
  const kinds = new Set(customer360TimelineKindsForContext(roles, leadId))
  return entries.filter((e) => kinds.has(e.kind))
}
