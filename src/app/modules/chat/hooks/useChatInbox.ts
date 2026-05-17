import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { listChatInbox } from '../api/chat'
import type { ChatInboxItem } from '../types'

export function useChatInbox(userId: string) {
  const [items, setItems] = useState<ChatInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setItems(await listChatInbox(userId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดกล่องข้อความไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel('chat-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => {
          void reload()
        },
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [reload])

  const totalUnread = items.reduce((sum, row) => sum + row.unread_count, 0)

  return { items, loading, error, totalUnread, reload }
}
