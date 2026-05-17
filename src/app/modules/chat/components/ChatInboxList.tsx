import { useMemo, useState } from 'react'
import { formatChatListTime, truncatePreview } from '../utils/chatDisplay'
import type { ChatChannelKey, ChatInboxItem } from '../types'
import { ChatAvatar } from './ChatAvatar'
import '../chat.css'

interface ChatInboxListProps {
  items: ChatInboxItem[]
  loading: boolean
  selectedProjectId: string
  selectedChannel?: ChatChannelKey
  onSelect: (projectId: string, channel: ChatChannelKey) => void
  emptyHint?: string
}

export function ChatInboxList({
  items,
  loading,
  selectedProjectId,
  selectedChannel = 'client',
  onSelect,
  emptyHint = 'ยังไม่มีแชท — เปิดแชทจากหน้าโปรเจกต์',
}: ChatInboxListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (row) =>
        row.project_name.toLowerCase().includes(q) ||
        row.brand_name.toLowerCase().includes(q) ||
        row.channel_label.toLowerCase().includes(q) ||
        (row.last_message_body?.toLowerCase().includes(q) ?? false),
    )
  }, [items, query])

  const unreadTotal = items.reduce((sum, row) => sum + row.unread_count, 0)

  return (
    <aside className="chat-inbox">
      <div className="chat-inbox__head">
        <h2 className="chat-inbox__title">ห้องสนทนา</h2>
        {unreadTotal > 0 && <span className="chat-inbox__pill">{unreadTotal}</span>}
      </div>

      <label className="chat-inbox__search">
        <span className="visually-hidden">ค้นหาห้องแชท</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
          <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาโปรเจกต์ / ห้องทีม…"
          className="chat-inbox__search-input"
        />
      </label>

      {loading && <p className="muted chat-inbox__status">กำลังโหลด…</p>}
      {!loading && filtered.length === 0 && (
        <p className="muted chat-inbox__status">{query.trim() ? 'ไม่พบห้องที่ตรงกับคำค้น' : emptyHint}</p>
      )}

      <ul className="chat-inbox__list">
        {filtered.map((row) => {
          const active =
            row.project_id === selectedProjectId && row.channel === selectedChannel
          const hasUnread = row.unread_count > 0
          const roomTitle =
            row.channel === 'client' ? row.project_name : `${row.project_name} · ${row.channel_label}`
          return (
            <li key={row.room_id}>
              <button
                type="button"
                className={`chat-inbox__item${active ? ' chat-inbox__item--active' : ''}${
                  hasUnread ? ' chat-inbox__item--unread' : ''
                }`}
                onClick={() => onSelect(row.project_id, row.channel)}
              >
                <ChatAvatar name={row.brand_name} seed={`${row.project_id}-${row.channel}`} size="md" />
                <span className="chat-inbox__body">
                  <span className="chat-inbox__row">
                    <strong className="chat-inbox__name">{roomTitle}</strong>
                    {row.last_message_at && (
                      <time className="chat-inbox__time" dateTime={row.last_message_at}>
                        {formatChatListTime(row.last_message_at)}
                      </time>
                    )}
                  </span>
                  <span className="chat-inbox__brand">{row.brand_name}</span>
                  {row.last_message_body && (
                    <span className="chat-inbox__preview">
                      {truncatePreview(row.last_message_body)}
                    </span>
                  )}
                </span>
                {hasUnread && (
                  <span className="chat-inbox__badge" aria-label={`${row.unread_count} ยังไม่อ่าน`}>
                    {row.unread_count > 99 ? '99+' : row.unread_count}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
