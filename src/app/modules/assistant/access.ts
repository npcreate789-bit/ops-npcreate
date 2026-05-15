import {
  canViewRenewals,
  hasAdsPrivilegedBypass,
  hasContentTeamView,
  hasDbPrivilegedRole,
  hasNavFullAccess,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { STAFF_PROMPT_OPTIONS } from './constants'
import type { StaffPromptKey } from './types'

export function canUseStaffPrompt(roles: AppRole[], key: StaffPromptKey): boolean {
  if (hasNavFullAccess(roles) || hasDbPrivilegedRole(roles)) return true

  switch (key) {
    case 'crm_followup':
      return roles.some((r) =>
        (['sales', 'admin', 'account', 'operations'] as AppRole[]).includes(r),
      )
    case 'renewal_pitch':
      return canViewRenewals(roles)
    case 'content_brief':
      return hasContentTeamView(roles)
    case 'ads_summary':
      return (
        hasAdsPrivilegedBypass(roles) ||
        roles.some((r) => (['ads', 'senior_ads'] as AppRole[]).includes(r))
      )
    case 'onboarding_checkin':
      return roles.some((r) =>
        (['account', 'operations', 'sales'] as AppRole[]).includes(r),
      )
    default:
      return false
  }
}

export function staffPromptKeysForRoles(roles: AppRole[]): StaffPromptKey[] {
  if (roles.length === 0) {
    return STAFF_PROMPT_OPTIONS.map((o) => o.value)
  }
  return STAFF_PROMPT_OPTIONS.map((o) => o.value).filter((k) => canUseStaffPrompt(roles, k))
}

export function staffPromptOptionsForRoles(roles: AppRole[]) {
  const allowed = new Set(staffPromptKeysForRoles(roles))
  return STAFF_PROMPT_OPTIONS.filter((o) => allowed.has(o.value))
}

export function isStaffAssistantScoped(roles: AppRole[]): boolean {
  if (roles.length === 0) return false
  const keys = staffPromptKeysForRoles(roles)
  return keys.length > 0 && keys.length < STAFF_PROMPT_OPTIONS.length
}
