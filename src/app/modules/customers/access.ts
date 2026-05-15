import { canAccessNavPath } from '../../config/navigation'
import {
  canViewRenewals,
  canViewReportFinanceMetrics,
  hasContentTeamView,
  hasDbPrivilegedRole,
  hasNavFullAccess,
} from '../../../shared/auth/access'
import { canViewWeeklyAdsMetrics } from '../weekly/access'
import type { AppRole } from '../../../shared/types/roles'

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

export function canLinkCustomerCrm(roles: AppRole[]): boolean {
  return canShowCustomer360Link(roles, '/app/crm')
}
