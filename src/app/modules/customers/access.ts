import {
  canViewFinance,
  canViewRenewals,
  hasAdsPrivilegedBypass,
  hasContentTeamView,
  hasCrmTeamView,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'

export { canViewCustomer360 } from '../../../shared/auth/access'

export function canLinkCustomerFinance(roles: AppRole[]): boolean {
  return canViewFinance(roles) || roles.length === 0
}

export function canLinkCustomerRenewals(roles: AppRole[]): boolean {
  return canViewRenewals(roles) || roles.length === 0
}

export function canLinkCustomerAds(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return (
    hasAdsPrivilegedBypass(roles) ||
    roles.some((r) => (['ads', 'senior_ads', 'account'] as AppRole[]).includes(r))
  )
}

export function canLinkCustomerCrm(roles: AppRole[]): boolean {
  return hasCrmTeamView(roles) || roles.includes('sales') || roles.length === 0
}

export function canLinkCustomerContent(roles: AppRole[]): boolean {
  return hasContentTeamView(roles) || roles.length === 0
}
