import { canAccessNavPath } from '../../config/navigation'
import { canUseQuickAccess } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { isTrackableAppPath, resolvePageMeta } from './pathMeta'
import type { QuickAccessEntry, QuickAccessState } from './types'

export { canUseQuickAccess }

export function filterVisibleQuickAccess(
  entries: QuickAccessEntry[],
  roles: AppRole[],
  configured = false,
): QuickAccessEntry[] {
  if (roles.length === 0) {
    return configured ? [] : entries
  }
  return entries.filter((entry) => canOpenQuickAccessPath(roles, entry.path, configured))
}

export function canOpenQuickAccessPath(
  roles: AppRole[],
  path: string,
  configured = true,
): boolean {
  if (roles.length === 0) return !configured
  return canAccessNavPath(roles, path)
}

export function canPinQuickAccessPath(
  roles: AppRole[],
  path: string,
  configured = true,
): boolean {
  return canOpenQuickAccessPath(roles, path, configured)
}

export function shouldRecordQuickAccessVisit(
  pathname: string,
  roles: AppRole[],
  configured: boolean,
): boolean {
  if (!isTrackableAppPath(pathname)) return false
  const { path } = resolvePageMeta(pathname)
  if (path === '/app') return false
  if (configured && roles.length > 0 && !canOpenQuickAccessPath(roles, path, configured)) {
    return false
  }
  return true
}

export function sanitizeQuickAccessState(
  state: QuickAccessState,
  roles: AppRole[],
  configured: boolean,
): QuickAccessState {
  return {
    recent: filterVisibleQuickAccess(state.recent, roles, configured),
    pinned: state.pinned.filter((path) => {
      if (roles.length === 0 && !configured) return true
      if (roles.length === 0) return false
      return canOpenQuickAccessPath(roles, path, configured)
    }),
  }
}

export function entryFromPath(path: string): QuickAccessEntry {
  const meta = resolvePageMeta(path)
  return {
    ...meta,
    visitedAt: new Date().toISOString(),
  }
}
