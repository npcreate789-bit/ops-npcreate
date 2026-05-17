import { useCallback, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import {
  ensureProjectChatRoom,
  listChatMessages,
  markChatRoomRead,
  sendChatMessage,
} from '../api/chat'
import { uploadChatFile } from '../api/chatFiles'
import type { ChatMessage } from '../types'

export function useProjectChat(projectId: string | undefined, userId: string) {
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
      const rid = await ensureProjectChatRoom(projectId)
      setRoomId(rid)
      setMessages(await listChatMessages(rid, projectId))
      await markChatRoomRead(rid)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดแชทไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured || !supabase) return

    const channel = supabase
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
          void listChatMessages(roomId, projectId)
            .then((rows) => {
              setMessages(rows)
              return markChatRoomRead(roomId)
            })
            .catch(() => {})
        },
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [roomId, projectId])

  const send = useCallback(
    async (body: string) => {
      if (!roomId || !userId) return
      setSending(true)
      setError(null)
      try {
        const row = await sendChatMessage(
          { room_id: roomId, sender_id: userId, body },
          projectId,
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
    [roomId, userId, projectId],
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
    [roomId, userId, projectId, load],
  )

  return {
    roomId,
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
