import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listUnreadStaffAlertNotifications,
  markNotificationRead,
} from './api/notifications'
import { isActiveLeadLineChatNotificationLink } from '../crm/activeLeadLineChatFocus'
import { isInquiryNotification } from './inquiryNotification'
import { isLeadNotification } from './leadNotification'
import { isLeadLineMessageNotification } from './leadLineMessageNotification'
import { NOTIFICATION_PUSH_EVENT } from './leadNotification'
import { useNotificationRealtime } from './NotificationRealtimeContext'
import { stopLeadAlertLoop, syncLeadAlertLoop } from './notificationSound'
import type { UserNotification } from './types'

function shouldShowStaffAlertToast(row: UserNotification): boolean {
  if (isLeadLineMessageNotification(row.dedupe_key) && isActiveLeadLineChatNotificationLink(row.link)) {
    return false
  }
  return true
}

function filterVisibleStaffAlertToasts(rows: UserNotification[]): UserNotification[] {
  return rows.filter(shouldShowStaffAlertToast)
}

function shouldLoopStaffAlertSound(toasts: UserNotification[]): boolean {
  return toasts.some(
    (t) => isLeadNotification(t.dedupe_key) || isInquiryNotification(t.dedupe_key),
  )
}

function upsertToast(prev: UserNotification[], row: UserNotification): UserNotification[] {
  const without = prev.filter((t) => t.id !== row.id && t.dedupe_key !== row.dedupe_key)
  return [row, ...without]
}

export function useStaffAlertNotificationToasts(userId: string | undefined, enabled: boolean) {
  const [toasts, setToasts] = useState<UserNotification[]>([])
  const knownKeysRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)
  const realtime = useNotificationRealtime()

  const applyToasts = useCallback((next: UserNotification[]) => {
    const visible = filterVisibleStaffAlertToasts(next)
    knownKeysRef.current = new Set(visible.map((n) => n.dedupe_key))
    initialLoadRef.current = false
    setToasts(visible)
  }, [])

  const load = useCallback(async () => {
    if (!userId || !enabled) {
      knownKeysRef.current = new Set()
      initialLoadRef.current = true
      setToasts([])
      return
    }
    try {
      applyToasts(await listUnreadStaffAlertNotifications(userId))
    } catch {
      knownKeysRef.current = new Set()
      setToasts([])
    }
  }, [userId, enabled, applyToasts])

  const handleInsert = useCallback((row: UserNotification) => {
    if (!shouldShowStaffAlertToast(row)) return
    setToasts((prev) => {
      knownKeysRef.current.add(row.dedupe_key)
      return upsertToast(prev, row)
    })
  }, [])

  const handleUpdate = useCallback((row: UserNotification) => {
    if (row.read_at) {
      setToasts((prev) => prev.filter((t) => t.id !== row.id))
      return
    }
    if (!shouldShowStaffAlertToast(row)) {
      setToasts((prev) => prev.filter((t) => t.dedupe_key !== row.dedupe_key))
      return
    }
    setToasts((prev) => {
      knownKeysRef.current.add(row.dedupe_key)
      return upsertToast(prev, row)
    })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!enabled) {
      stopLeadAlertLoop()
      return
    }
    syncLeadAlertLoop(shouldLoopStaffAlertSound(toasts))
    return () => stopLeadAlertLoop()
  }, [toasts, enabled])

  useEffect(() => {
    if (!userId || !enabled) return

    const onPush = (e: Event) => {
      const detail = (e as CustomEvent<{ userId?: string }>).detail
      if (detail?.userId && detail.userId !== userId) return
      void load()
    }
    window.addEventListener(NOTIFICATION_PUSH_EVENT, onPush)
    const unsubInsert = realtime.subscribeStaffAlertInsert(handleInsert)
    const unsubUpdate = realtime.subscribeStaffAlertUpdate(handleUpdate)

    return () => {
      window.removeEventListener(NOTIFICATION_PUSH_EVENT, onPush)
      unsubInsert()
      unsubUpdate()
    }
  }, [userId, enabled, load, realtime, handleInsert, handleUpdate])

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
