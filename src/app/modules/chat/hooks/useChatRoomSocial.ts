import { useCallback, useEffect, useState } from 'react'
import { fetchChatRoomSocial } from '../api/chatSocial'
import type { ChatRoomSocialState } from '../types'

const EMPTY: ChatRoomSocialState = {
  readReceipts: [],
  pinned: [],
  reactions: {},
  notes: {},
}

export function useChatRoomSocial(roomId: string | null, refreshKey = 0) {
  const [social, setSocial] = useState<ChatRoomSocialState>(EMPTY)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!roomId) {
      setSocial(EMPTY)
      return
    }
    setLoading(true)
    try {
      setSocial(await fetchChatRoomSocial(roomId))
    } catch {
      setSocial(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    void reload()
  }, [reload, refreshKey])

  return { social, loading, reload, setSocial }
}
