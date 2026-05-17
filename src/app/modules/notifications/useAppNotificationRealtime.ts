import { useEffect, useRef } from 'react'
import { isSupabaseConfigured, supabase } from '../../../shared/supabase/client'
import { isLeadNotification, mapNotificationRow } from './leadNotification'
import { tryPlayIncomingNotificationSound } from './notificationSound'
import type { UserNotification } from './types'

type LeadInsertHandler = (row: UserNotification) => void
type LeadUpdateHandler = (row: UserNotification) => void

/** สมัคร Realtime ครั้งเดียวต่อแอป — กัน crash จาก channel ซ้ำ */
export function useAppNotificationRealtime(
  userId: string | undefined,
  enabled: boolean,
  onUnreadChange: () => void,
  onLeadInsert: LeadInsertHandler,
  onLeadUpdate: LeadUpdateHandler,
) {
  const onUnreadRef = useRef(onUnreadChange)
  const onLeadInsertRef = useRef(onLeadInsert)
  const onLeadUpdateRef = useRef(onLeadUpdate)

  onUnreadRef.current = onUnreadChange
  onLeadInsertRef.current = onLeadInsert
  onLeadUpdateRef.current = onLeadUpdate

  useEffect(() => {
    if (!userId || !enabled || !isSupabaseConfigured || !supabase) return

    const client = supabase
    const channelName = `app-notif-${userId}-${crypto.randomUUID()}`

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = mapNotificationRow(payload.new as Record<string, unknown>)
          onUnreadRef.current()
          tryPlayIncomingNotificationSound(row)
          if (isLeadNotification(row.dedupe_key) && !row.read_at) {
            onLeadInsertRef.current(row)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = mapNotificationRow(payload.new as Record<string, unknown>)
          onUnreadRef.current()
          if (isLeadNotification(row.dedupe_key)) {
            onLeadUpdateRef.current(row)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => onUnreadRef.current(),
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [userId, enabled])
}
