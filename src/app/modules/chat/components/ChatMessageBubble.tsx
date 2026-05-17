import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { getChatAttachmentUrl, isChatImageMime } from '../api/chatFiles'
import type { ChatMessage } from '../types'
import '../chat.css'

interface ChatMessageBubbleProps {
  message: ChatMessage
  mine: boolean
  canCreateTask: boolean
  creatingTask: boolean
  onCreateTask?: () => void
}

export function ChatMessageBubble({
  message,
  mine,
  canCreateTask,
  creatingTask,
  onCreateTask,
}: ChatMessageBubbleProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const isSystem = message.message_type === 'system'
  const isFile = message.message_type === 'file'

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

  return (
    <article
      className={`project-chat__msg${mine ? ' project-chat__msg--mine' : ''}${
        isSystem ? ' project-chat__msg--system' : ''
      }`}
    >
      {!isSystem && (
        <div className="project-chat__meta">
          <strong>{mine ? 'คุณ' : message.sender_name ?? 'ทีมงาน'}</strong>
          <time dateTime={message.created_at}>{formatBangkokDateTime(message.created_at)}</time>
        </div>
      )}

      {isSystem && (
        <p className="project-chat__system-label">ระบบ</p>
      )}

      {isFile ? (
        <div className="project-chat__file">
          {isChatImageMime(message.attachment_mime) && fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noreferrer noopener">
              <img
                src={fileUrl}
                alt={message.attachment_name ?? 'รูปแนบ'}
                className="project-chat__file-img"
              />
            </a>
          ) : (
            <p className="project-chat__file-name">
              📎 {message.attachment_name ?? message.body}
            </p>
          )}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="project-chat__task-link"
            >
              เปิดไฟล์
            </a>
          )}
          {fileError && <p className="crm-error">{fileError}</p>}
          {message.body && message.body !== message.attachment_name && (
            <p className="project-chat__body">{message.body}</p>
          )}
        </div>
      ) : (
        <p className="project-chat__body">{message.body}</p>
      )}

      {message.created_task_id ? (
        <Link to={`/app/tasks/${message.created_task_id}`} className="project-chat__task-link">
          {isSystem ? 'ดูงานที่สร้าง' : 'ดูงานที่สร้างแล้ว'}
        </Link>
      ) : canCreateTask && !mine && !isSystem && message.message_type === 'text' ? (
        <button
          type="button"
          className="crm-btn crm-btn--ghost crm-btn--sm"
          disabled={creatingTask}
          onClick={onCreateTask}
        >
          {creatingTask ? 'กำลังสร้างงาน...' : 'สร้าง Task'}
        </button>
      ) : null}
    </article>
  )
}
