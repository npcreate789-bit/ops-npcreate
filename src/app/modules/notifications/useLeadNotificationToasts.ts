import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured } from '../../../shared/supabase/client'
import { useRealtimeChannel } from '../../../shared/supabase/useRealtimeChannel'
import {
  listUnreadLeadNotifications,
  markNotificationRead,
} from './api/notifications'
import {
  NOTIFICATION_PUSH_EVENT,
  isLeadNotification,
  mapNotificationRow,
} from './leadNotification'
import { playLeadNotificationSound } from './notificationSound'
import type { UserNotification } from './types'

function upsertToast(prev: UserNotification[], row: UserNotification): UserNotification[] {
  const without = prev.filter((t) => t.id !== row.id && t.dedupe_key !== row.dedupe_key)
  return [row, ...without]
}

export function useLeadNotificationToasts(userId: string | undefined, enabled: boolean) {
  const [toasts, setToasts] = useState<UserNotification[]>([])
  const knownKeysRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  const applyToasts = useCallback((next: UserNotification[], playSoundForNew: boolean) => {
    if (playSoundForNew && !initialLoadRef.current) {
      const hasNew = next.some((n) => !knownKeysRef.current.has(n.dedupe_key))
      if (hasNew) playLeadNotificationSound()
    }
    knownKeysRef.current = new Set(next.map((n) => n.dedupe_key))
    initialLoadRef.current = false
    setToasts(next)
  }, [])

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      knownKeysRef.current = new Set()
      initialLoadRef.current = true
      setToasts([])
      return
    }
    try {
      applyToasts(await listUnreadLeadNotifications(userId), true)
    } catch {
      knownKeysRef.current = new Set()
      setToasts([])
    }
  }, [userId, enabled, applyToasts])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!userId || !enabled) return

    const onPush = (e: Event) => {
      const detail = (e as CustomEvent<{ userId?: string }>).detail
      if (detail?.userId && detail.userId !== userId) return
      void load()
    }
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onPush)
    return () => window.removeEventListener(NOTIFICATION_PUSH_EVENT, onPush)
  }, [userId, enabled, load])

  const handleRealtimeRow = useCallback((payload: { new: Record<string, unknown> }) => {
    const row = mapNotificationRow(payload.new)
    if (!isLeadNotification(row.dedupe_key)) return

    if (row.read_at) {
      setToasts((prev) => prev.filter((t) => t.id !== row.id))
      return
    }

    setToasts((prev) => {
      const had = prev.some((t) => t.dedupe_key === row.dedupe_key)
      if (!had) playLeadNotificationSound()
      knownKeysRef.current.add(row.dedupe_key)
      return upsertToast(prev, row)
    })
  }, [])

  useRealtimeChannel(
    Boolean(userId && enabled && isSupabaseConfigured),
    useCallback(
      (channel) =>
        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${userId}`,
            },
            handleRealtimeRow,
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${userId}`,
            },
            handleRealtimeRow,
          ),
      [userId, handleRealtimeRow],
    ),
    [userId, enabled],
  )

  const dismiss = useCallback(
    async (id: string) => {
      if (!userId) return
      setToasts((prev) => prev.filter((t) => t.id !== id))
      try {
        await markNotificationRead(userId, id)
      } catch {
        void load()
      }
    },
    [userId, load],
  )

  return { toasts, dismiss, reload: load }
}
