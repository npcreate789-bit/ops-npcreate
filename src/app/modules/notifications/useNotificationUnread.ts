import { useEffect, useRef, useState } from 'react'
import { canAccessNotifications } from '../../../shared/auth/access'
import { isSupabaseConfigured, supabase } from '../../../shared/supabase/client'
import type { AppRole } from '../../../shared/types/roles'
import { getUnreadNotificationCount } from './api/notifications'
import { NOTIFICATION_PUSH_EVENT } from './leadNotification'
import { playNotificationSound } from './notificationSound'

const POLL_MS = 60_000

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

    const onPush = () => {
      getUnreadNotificationCount(userId).then(applyCount).catch(() => {})
    }
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onPush)

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`notif-unread:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            getUnreadNotificationCount(userId).then(applyCount).catch(() => {})
          },
        )
        .subscribe()
    }

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener(NOTIFICATION_PUSH_EVENT, onPush)
      if (channel && supabase) void supabase.removeChannel(channel)
    }
  }, [userId, enabled])

  return count
}
