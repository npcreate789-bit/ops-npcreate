import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseChatChannel, type ChatChannelKey } from '../constants/channels'
import {
  ensureProjectChatChannel,
  listChatMessages,
  markChatRoomRead,
  sendChatMessage,
} from '../api/chat'
import { uploadChatFile } from '../api/chatFiles'
import { setActiveChatFocus } from '../activeChatFocus'
import type { ChatMessage } from '../types'

export function useProjectChat(
  projectId: string | undefined,
  userId: string,
  channel: ChatChannelKey = 'client',
) {
  const activeChannel = parseChatChannel(channel)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const load = useCallback(async () => {
    if (!projectId) {
      setRoomId(null)
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rid = await ensureProjectChatChannel(projectId, activeChannel)
      setRoomId(rid)
      setMessages(await listChatMessages(rid, projectId, activeChannel))
      await markChatRoomRead(rid)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดแชทไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [projectId, activeChannel])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (roomId && projectId) {
      setActiveChatFocus(roomId, projectId, activeChannel)
    }
    return () => setActiveChatFocus(null)
  }, [roomId, projectId, activeChannel])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured || !supabase) return

    const sub = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void listChatMessages(roomId, projectId, activeChannel)
            .then((rows) => {
              setMessages(rows)
              return markChatRoomRead(roomId)
            })
            .catch(() => {})
        },
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(sub)
    }
  }, [roomId, projectId, activeChannel])

  const send = useCallback(
    async (body: string) => {
      if (!roomId || !userId) return
      setSending(true)
      setError(null)
      try {
        const row = await sendChatMessage(
          { room_id: roomId, sender_id: userId, body },
          projectId,
          activeChannel,
        )
        if (!isSupabaseConfigured) {
          setMessages((prev) => [...prev, row])
        }
        await markChatRoomRead(roomId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'ส่งไม่สำเร็จ')
      } finally {
        setSending(false)
      }
    },
    [roomId, userId, projectId, activeChannel],
  )

  const sendFile = useCallback(
    async (file: File, caption?: string) => {
      if (!roomId || !projectId) return
      setSending(true)
      setError(null)
      try {
        await uploadChatFile(projectId, roomId, file, caption)
        if (!isSupabaseConfigured) {
          await load()
        }
        await markChatRoomRead(roomId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ')
      } finally {
        setSending(false)
      }
    },
    [roomId, projectId, load],
  )

  return {
    roomId,
    channel: activeChannel,
    messages,
    loading,
    sending,
    error,
    bottomRef,
    send,
    sendFile,
    reload: load,
  }
}
