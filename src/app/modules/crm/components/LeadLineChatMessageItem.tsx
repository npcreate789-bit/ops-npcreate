import { LeadLineMessageBody } from './LeadLineMessageBody'
import { parseLineChatReplyMeta } from '../leadLineChatUtils'
import type { LeadLineMessage } from '../types/leadLineChat'

interface LeadLineChatMessageItemProps {
  message: LeadLineMessage
  formattedTime: string
  canReply: boolean
  onReply: (message: LeadLineMessage) => void
}

export function LeadLineChatMessageItem({
  message,
  formattedTime,
  canReply,
  onReply,
}: LeadLineChatMessageItemProps) {
  const replyMeta = parseLineChatReplyMeta(message.metadata)
  const isOutbound = message.direction === 'outbound'

  return (
    <li
      className={`crm-line-chat__msg crm-line-chat__msg--${message.direction}`}
      data-message-id={message.id}
    >
      <div className="crm-line-chat__msg-inner">
        <span className="crm-line-chat__sender">{isOutbound ? 'ทีม' : 'ลูกค้า'}</span>
        {replyMeta ? (
          <div className="crm-line-chat__reply-quote" aria-label="อ้างอิงข้อความที่ตอบ">
            <span className="crm-line-chat__reply-quote-label">
              ตอบกลับ {replyMeta.reply_from === 'inbound' ? 'ลูกค้า' : 'ทีม'}
            </span>
            <span className="crm-line-chat__reply-quote-text">{replyMeta.reply_preview}</span>
          </div>
        ) : null}
        <LeadLineMessageBody message={message} />
        <div className="crm-line-chat__msg-foot">
          <time className="crm-line-chat__time" dateTime={message.created_at}>
            {formattedTime}
          </time>
          {canReply ? (
            <button
              type="button"
              className="crm-line-chat__msg-action"
              onClick={() => onReply(message)}
              aria-label="ตอบกลับข้อความนี้"
            >
              ตอบกลับ
            </button>
          ) : null}
        </div>
      </div>
    </li>
  )
}
