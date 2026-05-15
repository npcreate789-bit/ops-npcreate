import {
  canViewRenewals,
  canViewReportFinanceMetrics,
  canViewReports,
  canViewTimeline,
  hasAdsPrivilegedBypass,
  hasCrmTeamView,
  hasDbPrivilegedRole,
  hasNavFullAccess,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'

export type WeeklyMetricKey =
  | 'finance'
  | 'ads'
  | 'tasks'
  | 'leads'
  | 'content'
  | 'renewals'

export function canViewWeeklyAdsMetrics(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return (
    hasNavFullAccess(roles) ||
    hasAdsPrivilegedBypass(roles) ||
    roles.some((r) => (['ads', 'senior_ads', 'account'] as AppRole[]).includes(r))
  )
}

export function canViewWeeklyLeadMetrics(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return hasCrmTeamView(roles) || roles.includes('sales')
}

export function weeklyMetricKeysForRoles(roles: AppRole[]): WeeklyMetricKey[] {
  if (roles.length === 0) {
    return ['finance', 'ads', 'tasks', 'leads', 'content', 'renewals']
  }
  if (hasNavFullAccess(roles) || hasDbPrivilegedRole(roles)) {
    return ['finance', 'ads', 'tasks', 'leads', 'content', 'renewals']
  }
  const keys: WeeklyMetricKey[] = ['tasks', 'content']
  if (canViewReportFinanceMetrics(roles)) keys.unshift('finance')
  if (canViewWeeklyAdsMetrics(roles)) keys.push('ads')
  if (canViewWeeklyLeadMetrics(roles)) keys.push('leads')
  if (canViewRenewals(roles)) keys.push('renewals')
  return keys
}

export function isWeeklyReportScoped(roles: AppRole[]): boolean {
  if (roles.length === 0) return false
  const keys = weeklyMetricKeysForRoles(roles)
  return keys.length > 0 && keys.length < 6
}

export function canShowWeeklyInsightLink(roles: AppRole[], path: string): boolean {
  if (hasNavFullAccess(roles)) return true
  if (path.startsWith('/app/renewals')) return canViewRenewals(roles)
  if (path.startsWith('/app/timeline')) return canViewTimeline(roles)
  if (path.startsWith('/app/tasks')) {
    return hasNavFullAccess(roles) || roles.some((r) => r !== 'client')
  }
  if (path.startsWith('/app/ads')) return canViewWeeklyAdsMetrics(roles)
  if (path.startsWith('/app/crm')) return canViewWeeklyLeadMetrics(roles)
  if (path.startsWith('/app/finance')) return canViewReportFinanceMetrics(roles)
  if (path.startsWith('/app/reports')) return canViewReports(roles)
  return false
}
