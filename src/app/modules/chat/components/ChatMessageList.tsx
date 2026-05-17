import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { scrollChatFeedToBottom } from '../utils/chatScroll'
import { groupMessagesByDay } from '../utils/chatDisplay'
import type {
  ChatMessage,
  ChatReactionEmoji,
  ChatReadReceipt,
  ChatReactionsMap,
  ChatNotesMap,
} from '../types'
import { ChatDayDivider } from './ChatDayDivider'
import { ChatMessageBubble } from './ChatMessageBubble'
import '../chat.css'

interface ChatMessageListProps {
  messages: ChatMessage[]
  userId: string
  loading: boolean
  canCreateTask: boolean
  creatingFromId: string | null
  onCreateTask: (message: ChatMessage) => void
  bottomRef: RefObject<HTMLDivElement | null>
  searchQuery?: string
  pinnedIds?: Set<string>
  readReceipts?: ChatReadReceipt[]
  reactions?: ChatReactionsMap
  onPin?: (messageId: string) => void
  onUnpin?: (messageId: string) => void
  onToggleReaction?: (messageId: string, emoji: ChatReactionEmoji) => void
  onReply?: (message: ChatMessage) => void
  onJumpToMessage?: (messageId: string) => void
  notes?: ChatNotesMap
  openNotesMessageId?: string | null
  onToggleNotes?: (messageId: string, anchor: HTMLElement) => void
}

export function ChatMessageList({
  messages,
  userId,
  loading,
  canCreateTask,
  creatingFromId,
  onCreateTask,
  bottomRef,
  searchQuery = '',
  pinnedIds = new Set(),
  readReceipts = [],
  reactions = {},
  onPin,
  onUnpin,
  onToggleReaction,
  onReply,
  onJumpToMessage,
  notes = {},
  openNotesMessageId = null,
  onToggleNotes,
}: ChatMessageListProps) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [showJump, setShowJump] = useState(false)

  const groups = useMemo(() => groupMessagesByDay(messages), [messages])

  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i]
      if (m.sender_id === userId && m.message_type !== 'system') return m.id
    }
    return null
  }, [messages, userId])

  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowJump(gap > 100)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToLatest() {
    scrollChatFeedToBottom(feedRef.current, 'smooth')
    setShowJump(false)
  }

  return (
    <div className="chat-feed-wrap">
      <div ref={feedRef} className="chat-feed" role="log" aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="chat-feed__loading">
            <span className="chat-feed__loading-dot" />
            <span className="chat-feed__loading-dot" />
            <span className="chat-feed__loading-dot" />
            <span className="muted">กำลังโหลดข้อความ…</span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="chat-feed__empty">
            <div className="chat-feed__empty-icon" aria-hidden>
              💬
            </div>
            <p className="chat-feed__empty-title">เริ่มบทสนทนา</p>
            <p className="muted">
              {searchQuery.trim()
                ? 'ไม่พบข้อความที่ตรงกับคำค้น'
                : 'ส่งข้อความแรก · พิมพ์ @ เพื่อแท็กทีม · กดปักหมุดข้อความสำคัญ'}
            </p>
          </div>
        )}

        {!loading &&
          groups.map((group) => (
            <section key={group.dayKey} className="chat-feed__day">
              <ChatDayDivider label={group.label} />
              {group.messages.map((message, index) => {
                const mine = message.sender_id === userId
                const prev = group.messages[index - 1]
                const compact =
                  !mine &&
                  prev &&
                  prev.sender_id === message.sender_id &&
                  prev.message_type !== 'system' &&
                  message.message_type !== 'system'
                const isPinned = pinnedIds.has(message.id)

                return (
                  <ChatMessageBubble
                    key={message.id}
                    message={message}
                    mine={mine}
                    compact={compact}
                    canCreateTask={canCreateTask}
                    creatingTask={creatingFromId === message.id}
                    isPinned={isPinned}
                    showReadReceipt={message.id === lastOwnMessageId}
                    readReceipts={readReceipts}
                    reactions={reactions[message.id] ?? []}
                    userId={userId}
                    onCreateTask={() => onCreateTask(message)}
                    onPin={onPin ? () => onPin(message.id) : undefined}
                    onUnpin={onUnpin ? () => onUnpin(message.id) : undefined}
                    onToggleReaction={
                      onToggleReaction
                        ? (emoji) => onToggleReaction(message.id, emoji)
                        : undefined
                    }
                    onReply={onReply ? () => onReply(message) : undefined}
                    onJumpToReply={
                      onJumpToMessage && message.reply_to_id
                        ? () => onJumpToMessage(message.reply_to_id!)
                        : undefined
                    }
                    notes={notes[message.id] ?? []}
                    notesOpen={openNotesMessageId === message.id}
                    onToggleNotes={
                      onToggleNotes
                        ? (anchor) => onToggleNotes(message.id, anchor)
                        : undefined
                    }
                  />
                )
              })}
            </section>
          ))}

        <div ref={bottomRef} className="chat-feed__anchor" />
      </div>

      {showJump && (
        <button
          type="button"
          className="chat-feed__jump"
          onClick={scrollToLatest}
          aria-label="ไปข้อความล่าสุด"
        >
          ↓ ล่าสุด
        </button>
      )}
    </div>
  )
}
