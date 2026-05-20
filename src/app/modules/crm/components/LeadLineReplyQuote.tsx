import { lineChatReplySenderLabel } from '../leadLineChatUtils'
import type { LeadLineMessageView } from '../types/leadLineChat'

interface LeadLineReplyQuoteProps {
  message: LeadLineMessageView
  onJump?: () => void
}

export function LeadLineReplyQuote({ message, onJump }: LeadLineReplyQuoteProps) {
  if (!message.reply_to_body || message.reply_to_from == null) {
    return null
  }

  const senderLabel = lineChatReplySenderLabel(message.reply_to_from)
  const isImage = message.reply_to_message_type === 'image'
  const preview = isImage && !message.reply_to_body.includes('รูป')
    ? `รูปภาพ · ${message.reply_to_body}`
    : message.reply_to_body

  const className = `crm-line-reply-quote crm-line-reply-quote--${message.reply_to_from}`

  if (onJump) {
    return (
      <button type="button" className={className} onClick={onJump} title="ไปยังข้อความต้นทาง">
        <span className="crm-line-reply-quote__sender">{senderLabel}</span>
        <span className="crm-line-reply-quote__text">{preview}</span>
      </button>
    )
  }

  return (
    <div className={className} aria-label="อ้างอิงข้อความที่ตอบ">
      <span className="crm-line-reply-quote__sender">{senderLabel}</span>
      <span className="crm-line-reply-quote__text">{preview}</span>
    </div>
  )
}
