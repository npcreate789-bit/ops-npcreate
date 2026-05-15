export { canViewOpsCenter, OPS_CENTER_VIEW_ROLES } from '../../../shared/auth/access'

import { canAccessNavPath } from '../../config/navigation'
import { canUseGlobalSearch, canViewActivityLog } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'

export type OpsChecklistKey = 'env' | 'migrate' | 'build' | 'deploy'

export function canShowOpsQuickSearch(roles: AppRole[]): boolean {
  return canUseGlobalSearch(roles)
}

export function canShowOpsNavLink(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return true
  return canAccessNavPath(roles, path)
}

export function canShowOpsActivityLink(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return canViewActivityLog(roles)
}

export function opsChecklistStatus(
  key: OpsChecklistKey,
  configured: boolean,
): 'ok' | 'warn' | 'manual' {
  if (key === 'env') {
    return configured ? 'ok' : 'warn'
  }
  return 'manual'
}
