import { useEffect } from 'react'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { isNotificationSoundEnabled, playChatNotificationSound } from '../../notifications/notificationSound'
import { getActiveChatRoomId } from '../activeChatFocus'

/**
 * เล่นเสียงเมื่อมีข้อความแชทใหม่ (ครอบคลุมลูกค้าที่ไม่ได้ subscribe user_notifications)
 */
export function useChatMessageNotificationSound(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) return

    const client = supabase
    const channelName = `chat-msg-sound-${userId}-${crypto.randomUUID()}`

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const row = payload.new as {
            room_id?: string
            sender_id?: string
            message_type?: string
          }
          if (!row.room_id || row.sender_id === userId) return
          if (row.message_type === 'system') return
          if (getActiveChatRoomId() === row.room_id) return
          if (!isNotificationSoundEnabled()) return
          playChatNotificationSound()
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [userId])
}
