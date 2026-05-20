import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import {
  listLeadLineMessages,
  sendLeadLineChatMessage,
  type SendLeadLineChatInput,
} from '../api/leadLineChat'
import type { Lead } from '../types'
import type { LeadLineMessage } from '../types/leadLineChat'

const REALTIME_RELOAD_MS = 200

export function useLeadLineChat(
  lead: Pick<Lead, 'id' | 'owner_id' | 'line_user_id' | 'line_oa_chat_user_id'> | null,
  senderProfileId: string | undefined,
) {
  const leadId = lead?.id
  const [messages, setMessages] = useState<LeadLineMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoadedOnceRef = useRef(false)

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!leadId) {
        setMessages([])
        setLoading(false)
        hasLoadedOnceRef.current = false
        return
      }

      const silent = options?.silent ?? hasLoadedOnceRef.current
      if (!silent) setLoading(true)

      try {
        const rows = await listLeadLineMessages(leadId)
        setMessages(rows)
        hasLoadedOnceRef.current = true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดแชทไม่สำเร็จ')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [leadId],
  )

  const scheduleReload = useCallback(
    (silent = true) => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
      reloadTimerRef.current = setTimeout(() => {
        reloadTimerRef.current = null
        void load({ silent })
      }, REALTIME_RELOAD_MS)
    },
    [load],
  )

  useEffect(() => {
    hasLoadedOnceRef.current = false
    void load({ silent: false })
  }, [load])

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current)
    }
  }, [])

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
          scheduleReload(true)
        },
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(sub)
    }
  }, [leadId, scheduleReload])

  const send = useCallback(
    async (input: SendLeadLineChatInput) => {
      if (!lead) return
      setSending(true)
      setError(null)
      try {
        await sendLeadLineChatMessage(lead, input, senderProfileId)
        await load({ silent: true })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ')
        throw e
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
    send,
    reload: load,
  }
}
