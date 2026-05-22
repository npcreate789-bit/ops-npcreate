import { useEffect, useRef } from 'react'
import { isSupabaseConfigured, supabase } from '../../../shared/supabase/client'
import { mapNotificationRow } from './leadNotification'
import { isLeadLineMessageNotification } from './leadLineMessageNotification'
import { isStaffAlertNotification } from './staffAlertNotification'
import { tryPlayIncomingNotificationSound } from './notificationSound'
import type { UserNotification } from './types'

type StaffAlertHandler = (row: UserNotification) => void

/** สมัคร Realtime ครั้งเดียวต่อแอป — กัน crash จาก channel ซ้ำ */
export function useAppNotificationRealtime(
  userId: string | undefined,
  enabled: boolean,
  onUnreadChange: () => void,
  onStaffAlertInsert: StaffAlertHandler,
  onStaffAlertUpdate: StaffAlertHandler,
) {
  const onUnreadRef = useRef(onUnreadChange)
  const onStaffAlertInsertRef = useRef(onStaffAlertInsert)
  const onStaffAlertUpdateRef = useRef(onStaffAlertUpdate)

  /*
   * sync callback refs ใน useEffect แทน assign ระหว่าง render — React
   * Compiler ห้าม mutate ref.current ระหว่าง render เพราะอาจถูก memoized
   * จนการ assign ถูกข้าม → callback ใน channel จะเป็นเวอร์ชันค้าง
   */
  useEffect(() => {
    onUnreadRef.current = onUnreadChange
    onStaffAlertInsertRef.current = onStaffAlertInsert
    onStaffAlertUpdateRef.current = onStaffAlertUpdate
  })

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
          if (isStaffAlertNotification(row.dedupe_key) && !row.read_at) {
            onStaffAlertInsertRef.current(row)
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
          if (!row.read_at && isLeadLineMessageNotification(row.dedupe_key)) {
            tryPlayIncomingNotificationSound(row)
          }
          if (isStaffAlertNotification(row.dedupe_key)) {
            onStaffAlertUpdateRef.current(row)
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
