import { useEffect, useState } from 'react'
import { canAccessNotifications } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { getUnreadNotificationCount } from './api/notifications'

export function useNotificationUnread(userId: string | undefined, roles: AppRole[] = []) {
  const [count, setCount] = useState(0)
  const enabled = canAccessNotifications(roles)

  useEffect(() => {
    if (!userId || !enabled) {
      setCount(0)
      return
    }
    let cancelled = false
    getUnreadNotificationCount(userId)
      .then((n) => {
        if (!cancelled) setCount(n)
      })
      .catch(() => {
        if (!cancelled) setCount(0)
      })
    const interval = window.setInterval(() => {
      getUnreadNotificationCount(userId)
        .then((n) => {
          if (!cancelled) setCount(n)
        })
        .catch(() => {})
    }, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [userId, enabled])

  return count
}
