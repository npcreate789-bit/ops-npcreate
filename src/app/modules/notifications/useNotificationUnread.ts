import { useCallback, useEffect, useRef, useState } from 'react'
import { canAccessNotifications } from '../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../shared/supabase/client'
import { useRealtimeChannel } from '../../../shared/supabase/useRealtimeChannel'
import type { AppRole } from '../../../shared/types/roles'
import { getUnreadNotificationCount } from './api/notifications'
import { NOTIFICATION_PUSH_EVENT } from './leadNotification'
import { playNotificationAlert } from './notificationSound'

const POLL_MS = 60_000

function shouldPlaySound(prev: number | null, next: number): boolean {
  return prev !== null && next > prev && next > 0
}

export function useNotificationUnread(userId: string | undefined, roles: AppRole[] = []) {
  const [count, setCount] = useState(0)
  const prevCountRef = useRef<number | null>(null)
  const enabled = canAccessNotifications(roles)

  const refreshCount = useCallback(
    (opts?: { silent?: boolean }) => {
      if (!userId || !enabled) return
      getUnreadNotificationCount(userId)
        .then((n) => {
          if (!opts?.silent && shouldPlaySound(prevCountRef.current, n)) {
            playNotificationAlert()
          }
          prevCountRef.current = n
          setCount(n)
        })
        .catch(() => {
          prevCountRef.current = 0
          setCount(0)
        })
    },
    [userId, enabled],
  )

  useEffect(() => {
    if (!userId || !enabled) {
      prevCountRef.current = null
      setCount(0)
      return
    }

    refreshCount()

    const interval = window.setInterval(() => refreshCount(), POLL_MS)
    const onPush = () => refreshCount()
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onPush)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener(NOTIFICATION_PUSH_EVENT, onPush)
    }
  }, [userId, enabled, refreshCount])

  useRealtimeChannel(
    Boolean(userId && enabled && isSupabaseConfigured),
    useCallback(
      (channel) =>
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => refreshCount({ silent: true }),
        ),
      [userId, refreshCount],
    ),
    [userId, enabled],
  )

  return count
}
