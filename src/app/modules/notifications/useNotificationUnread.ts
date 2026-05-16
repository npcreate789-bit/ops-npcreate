import { useEffect, useRef, useState } from 'react'
import { canAccessNotifications } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { getUnreadNotificationCount } from './api/notifications'
import { playNotificationSound } from './notificationSound'

const POLL_MS = 45_000

function shouldPlaySound(prev: number | null, next: number): boolean {
  return prev !== null && next > prev && next > 0
}

export function useNotificationUnread(userId: string | undefined, roles: AppRole[] = []) {
  const [count, setCount] = useState(0)
  const prevCountRef = useRef<number | null>(null)
  const enabled = canAccessNotifications(roles)

  useEffect(() => {
    if (!userId || !enabled) {
      prevCountRef.current = null
      setCount(0)
      return
    }

    let cancelled = false

    const applyCount = (n: number) => {
      if (cancelled) return
      if (shouldPlaySound(prevCountRef.current, n)) {
        playNotificationSound()
      }
      prevCountRef.current = n
      setCount(n)
    }

    getUnreadNotificationCount(userId)
      .then(applyCount)
      .catch(() => {
        if (!cancelled) {
          prevCountRef.current = 0
          setCount(0)
        }
      })

    const interval = window.setInterval(() => {
      getUnreadNotificationCount(userId).then(applyCount).catch(() => {})
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [userId, enabled])

  return count
}
