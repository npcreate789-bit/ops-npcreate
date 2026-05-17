import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getChatAttachmentUrl } from '../api/chatFiles'
import { ChatMediaAttachment } from './ChatMediaAttachment'
import { formatChatBubbleTime, formatFullTimestamp } from '../utils/chatDisplay'
import { renderChatBody } from '../utils/chatBody'
import { formatReadReceiptLabel, readersForMessage } from '../utils/readReceipts'
import type { ChatMessage, ChatReactionEmoji, ChatReactionEntry, ChatReadReceipt } from '../types'
import { ChatAvatar } from './ChatAvatar'
import { ChatReactionRow } from './ChatReactionRow'
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
      }${isPinned ? ' chat-bubble--pinned' : ''}`}
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
