import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { listLeadLineMessages, sendLeadLineChatMessage } from '../api/leadLineChat'
import type { Lead } from '../types'
import type { LeadLineMessage } from '../types/leadLineChat'

export function useLeadLineChat(
  lead: Pick<Lead, 'id' | 'line_user_id' | 'line_oa_chat_user_id'> | null,
  senderProfileId: string | undefined,
) {
  const leadId = lead?.id
  const [messages, setMessages] = useState<LeadLineMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!leadId) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setMessages(await listLeadLineMessages(leadId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดแชทไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, loading])

  useEffect(() => {
    if (!leadId || !isSupabaseConfigured || !supabase) return

    const sub = supabase
      .channel(`lead-line-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_line_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          void load()
        },
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(sub)
    }
  }, [leadId, load])

  const send = useCallback(
    async (text: string) => {
      if (!lead) return
      setSending(true)
      setError(null)
      try {
        await sendLeadLineChatMessage(lead, text, senderProfileId)
        await load()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ')
      } finally {
        setSending(false)
      }
    },
    [lead, senderProfileId, load],
  )

  return {
    messages,
    loading,
    sending,
    error,
    bottomRef,
    send,
    reload: load,
  }
}
