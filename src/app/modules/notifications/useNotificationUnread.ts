import { useEffect, useRef, useState } from 'react'
import { canAccessNotifications } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import { getUnreadNotificationCount } from './api/notifications'
import { NOTIFICATION_PUSH_EVENT } from './leadNotification'
import { useNotificationRealtime } from './NotificationRealtimeContext'
import { playNotificationAlert } from './notificationSound'

const POLL_MS = 60_000

function shouldPlaySound(prev: number | null, next: number): boolean {
  return prev !== null && next > prev && next > 0
}

export function useNotificationUnread(userId: string | undefined, roles: AppRole[] = []) {
  const [count, setCount] = useState(0)
  const prevCountRef = useRef<number | null>(null)
  const enabled = canAccessNotifications(roles)
  const realtime = useNotificationRealtime()

  useEffect(() => {
    if (!userId || !enabled) {
      prevCountRef.current = null
      setCount(0)
      return
    }

    let cancelled = false

    const refresh = (opts?: { silent?: boolean }) => {
      getUnreadNotificationCount(userId)
        .then((n) => {
          if (cancelled) return
          if (!opts?.silent && shouldPlaySound(prevCountRef.current, n)) {
            playNotificationAlert()
          }
          prevCountRef.current = n
          setCount(n)
        })
        .catch(() => {
          if (!cancelled) {
            prevCountRef.current = 0
            setCount(0)
          }
        })
    }

    refresh()

    const interval = window.setInterval(() => refresh(), POLL_MS)
    const onPush = () => refresh()
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onPush)
    const unsubRealtime = realtime.subscribeUnread(() => refresh({ silent: true }))

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener(NOTIFICATION_PUSH_EVENT, onPush)
      unsubRealtime()
    }
  }, [userId, enabled, realtime])

  return count
}
