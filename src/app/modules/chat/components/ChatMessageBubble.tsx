import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getChatAttachmentUrl } from '../api/chatFiles'
import { ChatMediaAttachment } from './ChatMediaAttachment'
import { formatChatBubbleTime, formatFullTimestamp } from '../utils/chatDisplay'
import { renderChatBody } from '../utils/chatBody'
import { formatReadReceiptLabel, readersForMessage } from '../utils/readReceipts'
import type {
  ChatMessage,
  ChatMessageNote,
  ChatReactionEmoji,
  ChatReactionEntry,
  ChatReadReceipt,
} from '../types'
import { ChatAvatar } from './ChatAvatar'
import { ChatReactionRow } from './ChatReactionRow'
import { ChatReplyQuote } from './ChatReplyQuote'
import '../chat.css'

interface ChatMessageBubbleProps {
  message: ChatMessage
  mine: boolean
  compact?: boolean
  canCreateTask: boolean
  creatingTask: boolean
  isPinned?: boolean
  showReadReceipt?: boolean
  readReceipts?: ChatReadReceipt[]
  reactions?: ChatReactionEntry[]
  userId: string
  onCreateTask?: () => void
  onPin?: () => void
  onUnpin?: () => void
  onToggleReaction?: (emoji: ChatReactionEmoji) => void
  onReply?: () => void
  onJumpToReply?: () => void
  notes?: ChatMessageNote[]
  notesOpen?: boolean
  onToggleNotes?: (anchor: HTMLElement) => void
}

function ChatNoteIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10a2 2 0 0 1 2 2v11.2a.8.8 0 0 1-1.3.6L14 15H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.22 : 0}
      />
      <path
        d="M9 8h6M9 11.5h4"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ChatMessageBubble({
  message,
  mine,
  compact = false,
  canCreateTask,
  creatingTask,
  isPinned = false,
  showReadReceipt = false,
  readReceipts = [],
  reactions = [],
  userId,
  onCreateTask,
  onPin,
  onUnpin,
  onToggleReaction,
  onReply,
  onJumpToReply,
  notes = [],
  notesOpen = false,
  onToggleNotes,
}: ChatMessageBubbleProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isSystem = message.message_type === 'system'
  const isFile = message.message_type === 'file'
  const senderLabel = mine ? 'คุณ' : (message.sender_name ?? 'ทีมงาน')
  const readLabel =
    showReadReceipt && mine
      ? formatReadReceiptLabel(readersForMessage(message, readReceipts))
      : null

  useEffect(() => {
    if (!isFile || !message.attachment_path) {
      setFileUrl(null)
      return
    }
    let cancelled = false
    getChatAttachmentUrl(message.attachment_path)
      .then((url) => {
        if (!cancelled) setFileUrl(url)
      })
      .catch((e) => {
        if (!cancelled) {
          setFileError(e instanceof Error ? e.message : 'โหลดไฟล์ไม่สำเร็จ')
        }
      })
    return () => {
      cancelled = true
    }
  }, [isFile, message.attachment_path])

  async function handleCopy() {
    if (!message.body) return
    try {
      await navigator.clipboard.writeText(message.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (isSystem) {
    return (
      <article id={`chat-msg-${message.id}`} className="chat-bubble chat-bubble--system">
        <span className="chat-bubble__system-icon" aria-hidden>
          ◇
        </span>
        <p className="chat-bubble__system-text">{renderChatBody(message.body)}</p>
        {message.created_task_id && (
          <Link to={`/app/tasks/${message.created_task_id}`} className="chat-bubble__action">
            ดูงานที่สร้าง
          </Link>
        )}
        <time
          className="chat-bubble__time"
          dateTime={message.created_at}
          title={formatFullTimestamp(message.created_at)}
        >
          {formatChatBubbleTime(message.created_at)}
        </time>
      </article>
    )
  }

  return (
    <article
      id={`chat-msg-${message.id}`}
      className={`chat-bubble${mine ? ' chat-bubble--mine' : ' chat-bubble--theirs'}${
        compact ? ' chat-bubble--compact' : ''
      }${isPinned ? ' chat-bubble--pinned' : ''}${notesOpen ? ' chat-bubble--notes-open' : ''}`}
    >
      {!mine && !compact && (
        <ChatAvatar name={message.sender_name} seed={message.sender_id} size="sm" className="chat-bubble__avatar" />
      )}
      {!mine && compact && <span className="chat-bubble__avatar-spacer" aria-hidden />}

      <div className="chat-bubble__content">
        {!compact && (
          <header className="chat-bubble__head">
            <strong className="chat-bubble__sender">{senderLabel}</strong>
            {isPinned && <span className="chat-bubble__pin-badge">ปักหมุด</span>}
            <time
              className="chat-bubble__time"
              dateTime={message.created_at}
              title={formatFullTimestamp(message.created_at)}
            >
              {formatChatBubbleTime(message.created_at)}
            </time>
          </header>
        )}

        <div className="chat-bubble__bubble">
          {onToggleNotes && message.message_type !== 'system' && (
            <button
              type="button"
              className={`chat-bubble__note-icon${
                notes.length > 0 ? ' chat-bubble__note-icon--has-notes' : ''
              }${notesOpen ? ' chat-bubble__note-icon--open' : ''}`}
              onClick={(e) => onToggleNotes(e.currentTarget)}
              aria-label={
                notes.length > 0 ? `ดูโน้ต ${notes.length} รายการ` : 'เพิ่มโน้ตข้อความ'
              }
              aria-expanded={notesOpen}
            >
              <ChatNoteIcon active={notes.length > 0 || notesOpen} />
              {notes.length > 0 && (
                <span className="chat-bubble__note-count" aria-hidden>
                  {notes.length > 9 ? '9+' : notes.length}
                </span>
              )}
            </button>
          )}
          <ChatReplyQuote
            message={message}
            userId={userId}
            onJump={
              message.reply_to_id && onJumpToReply ? () => onJumpToReply() : undefined
            }
          />
          {isFile ? (
            <div className="chat-bubble__file">
              <ChatMediaAttachment
                fileUrl={fileUrl}
                fileError={fileError}
                mime={message.attachment_mime}
                name={message.attachment_name}
                body={message.body}
                size={message.attachment_size}
              />
              {message.body && message.body !== message.attachment_name && (
                <p className="chat-bubble__text">{renderChatBody(message.body)}</p>
              )}
            </div>
          ) : (
            <p className="chat-bubble__text">{renderChatBody(message.body)}</p>
          )}

          <div className="chat-bubble__toolbar">
            {compact && (
              <time
                className="chat-bubble__time chat-bubble__time--inline"
                dateTime={message.created_at}
                title={formatFullTimestamp(message.created_at)}
              >
                {formatChatBubbleTime(message.created_at)}
              </time>
            )}
            {message.body && (
              <button
                type="button"
                className="chat-bubble__tool"
                onClick={() => void handleCopy()}
                title="คัดลอกข้อความ"
              >
                {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
            )}
            {onReply && (
              <button type="button" className="chat-bubble__tool" onClick={onReply}>
                ตอบกลับ
              </button>
            )}
            {onPin && !isPinned && (
              <button type="button" className="chat-bubble__tool" onClick={onPin}>
                ปักหมุด
              </button>
            )}
            {onUnpin && isPinned && (
              <button type="button" className="chat-bubble__tool" onClick={onUnpin}>
                เลิกปักหมุด
              </button>
            )}
          </div>
        </div>

        {onToggleReaction && (
          <ChatReactionRow
            messageId={message.id}
            reactions={reactions}
            userId={userId}
            onToggle={onToggleReaction}
          />
        )}

        {readLabel && <p className="chat-bubble__read-receipt">{readLabel}</p>}

        {message.created_task_id ? (
          <Link to={`/app/tasks/${message.created_task_id}`} className="chat-bubble__action">
            ดูงานที่สร้างแล้ว →
          </Link>
        ) : canCreateTask && !mine && message.message_type === 'text' ? (
          <button
            type="button"
            className="chat-bubble__action chat-bubble__action--btn"
            disabled={creatingTask}
            onClick={onCreateTask}
          >
            {creatingTask ? 'กำลังสร้างงาน…' : '+ สร้าง Task จากข้อความนี้'}
          </button>
        ) : null}
      </div>
    </article>
  )
}
