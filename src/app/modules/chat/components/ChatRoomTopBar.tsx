import { useMemo } from 'react'
import type { ChatMessage, ChatMessageNote, ChatChannelKey } from '../types'
import { CHAT_CHANNEL_HINTS } from '../constants/channels'
import { chatMessagePreviewText } from '../utils/replyPreview'
import { formatChatBubbleTime } from '../utils/chatDisplay'
import { ChatChannelTabs } from './ChatChannelTabs'
import { ChatNoteIcon } from './ChatNoteIcon'
import '../chat.css'

export interface NotedMessageEntry {
  message: ChatMessage
  notes: ChatMessageNote[]
  hasMine: boolean
}

interface ChatRoomTopBarProps {
  channels: { channel: ChatChannelKey; label: string }[]
  activeChannel: ChatChannelKey
  onChannelChange?: (channel: ChatChannelKey) => void
  channelTabsDisabled?: boolean
  showChannelTabs?: boolean
  messages: ChatMessage[]
  notesMap: Record<string, ChatMessageNote[]>
  userId: string
  notesPanelOpen: boolean
  onToggleNotesPanel: () => void
  onOpenNotedMessage: (messageId: string, anchor: HTMLElement) => void
  activeNotedMessageId?: string | null
}

export function ChatRoomTopBar({
  channels,
  activeChannel,
  onChannelChange,
  channelTabsDisabled = false,
  showChannelTabs = true,
  messages,
  notesMap,
  userId,
  notesPanelOpen,
  onToggleNotesPanel,
  onOpenNotedMessage,
  activeNotedMessageId = null,
}: ChatRoomTopBarProps) {
  const notedEntries = useMemo(() => {
    const entries: NotedMessageEntry[] = []
    for (const [messageId, notes] of Object.entries(notesMap)) {
      if (!notes.length) continue
      const message = messages.find((m) => m.id === messageId)
      if (!message || message.message_type === 'system') continue
      entries.push({
        message,
        notes,
        hasMine: notes.some((n) => n.author_id === userId),
      })
    }
    return entries.sort(
      (a, b) =>
        new Date(b.notes[b.notes.length - 1]!.updated_at).getTime() -
        new Date(a.notes[a.notes.length - 1]!.updated_at).getTime(),
    )
  }, [messages, notesMap, userId])

  const totalNotes = notedEntries.reduce((sum, e) => sum + e.notes.length, 0)
  const hasNoted = notedEntries.length > 0

  return (
    <div className="chat-room-top-bar">
      <nav className="chat-room-top-bar__nav" aria-label="ห้องแชทและโน้ต">
        {showChannelTabs && channels.length > 1 && (
          <ChatChannelTabs
            channels={channels}
            active={activeChannel}
            disabled={channelTabsDisabled}
            onChange={(ch) => onChannelChange?.(ch)}
            embedded
          />
        )}
        {showChannelTabs && channels.length === 1 && (
          <span className="chat-room-top-bar__room-label" title={CHAT_CHANNEL_HINTS[channels[0]!.channel]}>
            {channels[0]!.label}
          </span>
        )}

        <button
          type="button"
          className={`chat-room-top-bar__notes-tab${
            notesPanelOpen ? ' chat-room-top-bar__notes-tab--open' : ''
          }${hasNoted ? ' chat-room-top-bar__notes-tab--has-notes' : ''}`}
          onClick={onToggleNotesPanel}
          aria-expanded={notesPanelOpen}
          aria-controls="chat-noted-panel"
          title={hasNoted ? `ข้อความที่มีโน้ต ${notedEntries.length} รายการ` : 'ดูโน้ตในห้องนี้'}
        >
          <ChatNoteIcon size={15} active={hasNoted || notesPanelOpen} />
          <span>โน้ต</span>
          {hasNoted && (
            <span className="chat-room-top-bar__notes-count" aria-label={`${totalNotes} โน้ต`}>
              {notedEntries.length}
            </span>
          )}
        </button>
      </nav>

      {notesPanelOpen && (
        <div id="chat-noted-panel" className="chat-noted-panel" role="region" aria-label="รายการข้อความที่มีโน้ต">
          {notedEntries.length === 0 ? (
            <p className="chat-noted-panel__empty muted">
              ยังไม่มีโน้ตในห้องนี้ — กด «โน้ต» ที่ข้อความเพื่อบันทึก
            </p>
          ) : (
            <ul className="chat-noted-panel__list">
              {notedEntries.map(({ message, notes, hasMine }) => {
                const sender =
                  message.sender_id === userId
                    ? 'คุณ'
                    : (message.sender_name?.trim() || 'สมาชิก')
                const latest = notes[notes.length - 1]!
                const isActive = activeNotedMessageId === message.id
                return (
                  <li key={message.id}>
                    <button
                      type="button"
                      className={`chat-noted-panel__item${isActive ? ' chat-noted-panel__item--active' : ''}`}
                      onClick={(e) => onOpenNotedMessage(message.id, e.currentTarget)}
                    >
                      <span className="chat-noted-panel__item-icon" aria-hidden>
                        <ChatNoteIcon size={14} active />
                      </span>
                      <span className="chat-noted-panel__item-body">
                        <span className="chat-noted-panel__item-meta">
                          <strong>{sender}</strong>
                          <time dateTime={message.created_at}>
                            {formatChatBubbleTime(message.created_at)}
                          </time>
                          {hasMine && <span className="chat-noted-panel__mine">โน้ตของคุณ</span>}
                        </span>
                        <span className="chat-noted-panel__preview">{chatMessagePreviewText(message, 72)}</span>
                        <span className="chat-noted-panel__latest muted">
                          {latest.author_id === userId ? 'คุณ' : (latest.author_name ?? 'สมาชิก')}:{' '}
                          {latest.body.length > 56 ? `${latest.body.slice(0, 55)}…` : latest.body}
                        </span>
                      </span>
                      <span className="chat-noted-panel__badge">{notes.length}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
