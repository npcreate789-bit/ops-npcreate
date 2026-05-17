import type { ChatReplyTarget } from '../types'
import { replyTargetPreviewText, replyTargetSenderLabel } from '../utils/replyPreview'
import '../chat.css'

interface ChatReplyBarProps {
  target: ChatReplyTarget
  userId: string
  onCancel: () => void
  onJump?: () => void
}

export function ChatReplyBar({ target, userId, onCancel, onJump }: ChatReplyBarProps) {
  const sender = replyTargetSenderLabel(target, target.sender_id === userId)
  const preview = replyTargetPreviewText(target)

  return (
    <div className="chat-reply-bar" role="region" aria-label="กำลังตอบกลับ">
      <div className="chat-reply-bar__accent" aria-hidden />
      <button
        type="button"
        className="chat-reply-bar__body"
        onClick={onJump}
        disabled={!onJump}
        title={onJump ? 'ไปยังข้อความต้นทาง' : undefined}
      >
        <span className="chat-reply-bar__label">ตอบกลับ {sender}</span>
        <span className="chat-reply-bar__preview">{preview}</span>
      </button>
      <button
        type="button"
        className="chat-reply-bar__cancel"
        onClick={onCancel}
        aria-label="ยกเลิกการตอบกลับ"
        title="ยกเลิก"
      >
        ×
      </button>
    </div>
  )
}
