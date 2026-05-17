import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listUnreadLeadNotifications,
  markNotificationRead,
} from './api/notifications'
import { NOTIFICATION_PUSH_EVENT } from './leadNotification'
import { useNotificationRealtime } from './NotificationRealtimeContext'
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
  const realtime = useNotificationRealtime()

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

  const handleLeadInsert = useCallback((row: UserNotification) => {
    setToasts((prev) => {
      const had = prev.some((t) => t.dedupe_key === row.dedupe_key)
      if (!had) playLeadNotificationSound()
      knownKeysRef.current.add(row.dedupe_key)
      return upsertToast(prev, row)
    })
  }, [])

  const handleLeadUpdate = useCallback((row: UserNotification) => {
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
    const unsubInsert = realtime.subscribeLeadInsert(handleLeadInsert)
    const unsubUpdate = realtime.subscribeLeadUpdate(handleLeadUpdate)

    return () => {
      window.removeEventListener(NOTIFICATION_PUSH_EVENT, onPush)
      unsubInsert()
      unsubUpdate()
    }
  }, [userId, enabled, load, realtime, handleLeadInsert, handleLeadUpdate])

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
