import type { ChatMessage } from '../types'
import '../chat.css'

interface ChatReplyQuoteProps {
  message: ChatMessage
  userId: string
  onJump?: () => void
}

export function ChatReplyQuote({ message, userId, onJump }: ChatReplyQuoteProps) {
  if (!message.reply_to_id || !message.reply_to_body) return null

  const senderLabel =
    message.reply_to_sender_id === userId
      ? 'คุณ'
      : (message.reply_to_sender_name?.trim() || 'ทีมงาน')

  if (onJump) {
    return (
      <button
        type="button"
        className="chat-reply-quote"
        onClick={onJump}
        title="ไปยังข้อความต้นทาง"
      >
        <span className="chat-reply-quote__sender">{senderLabel}</span>
        <span className="chat-reply-quote__text">{message.reply_to_body}</span>
      </button>
    )
  }

  return (
    <div className="chat-reply-quote">
      <span className="chat-reply-quote__sender">{senderLabel}</span>
      <span className="chat-reply-quote__text">{message.reply_to_body}</span>
    </div>
  )
}
