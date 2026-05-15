import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { shouldRecordQuickAccessVisit } from '../access'
import { resolvePageMeta } from '../pathMeta'
import { recordRecentVisit } from '../storage'

interface PageHistoryTrackerProps {
  userId: string
}

export function PageHistoryTracker({ userId }: PageHistoryTrackerProps) {
  const { pathname } = useLocation()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []

  useEffect(() => {
    if (!shouldRecordQuickAccessVisit(pathname, roles, configured)) return
    const meta = resolvePageMeta(pathname)
    recordRecentVisit(userId, {
      ...meta,
      visitedAt: new Date().toISOString(),
    })
  }, [configured, pathname, roles, userId])

  return null
}
