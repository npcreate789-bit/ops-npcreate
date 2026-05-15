import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  canPinQuickAccessPath,
  entryFromPath,
  filterVisibleQuickAccess,
  sanitizeQuickAccessState,
} from '../modules/quick-access/access'
import {
  MAX_PINNED,
  pinnedEntries,
  readQuickAccess,
  togglePinnedPath,
  writeQuickAccess,
} from '../modules/quick-access/storage'
import type { QuickAccessState } from '../modules/quick-access/types'
import type { AppRole } from '../../shared/types/roles'

export function useQuickAccess(
  userId: string,
  roles: AppRole[],
  configured: boolean,
) {
  const { pathname } = useLocation()
  const [state, setState] = useState<QuickAccessState>(() =>
    sanitizeQuickAccessState(readQuickAccess(userId), roles, configured),
  )
  const [pinNotice, setPinNotice] = useState<string | null>(null)

  useEffect(() => {
    const raw = readQuickAccess(userId)
    const clean = sanitizeQuickAccessState(raw, roles, configured)
    const changed =
      clean.recent.length !== raw.recent.length ||
      clean.pinned.length !== raw.pinned.length
    if (changed) writeQuickAccess(userId, clean)
    setState(clean)
    setPinNotice(null)
  }, [configured, pathname, roles, userId])

  const lookup = useCallback((path: string) => entryFromPath(path), [])

  const pinned = useMemo(
    () => filterVisibleQuickAccess(pinnedEntries(state, lookup), roles, configured),
    [configured, lookup, roles, state],
  )

  const recent = useMemo(
    () => filterVisibleQuickAccess(state.recent, roles, configured),
    [configured, roles, state.recent],
  )

  const togglePin = useCallback(
    (path: string) => {
      if (configured && roles.length > 0 && !canPinQuickAccessPath(roles, path)) {
        return
      }
      const result = togglePinnedPath(userId, path)
      if (result.atLimit) {
        setPinNotice(`ปักหมุดได้สูงสุด ${MAX_PINNED} หน้า — เลิกปักหมุดรายการอื่นก่อน`)
        return
      }
      if (result.ok) {
        setState(sanitizeQuickAccessState(result.state, roles, configured))
        setPinNotice(null)
      }
    },
    [configured, roles, userId],
  )

  const isPinned = useCallback(
    (path: string) => state.pinned.includes(path),
    [state.pinned],
  )

  return { pinned, recent, togglePin, isPinned, pinNotice }
}
