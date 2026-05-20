import { LeadLineMessageBody } from './LeadLineMessageBody'
import { LeadLineReplyQuote } from './LeadLineReplyQuote'
import type { LeadLineMessageView } from '../types/leadLineChat'

interface LeadLineChatMessageItemProps {
  message: LeadLineMessageView
  formattedTime: string
  canReply: boolean
  canDelete: boolean
  deleting?: boolean
  onReply: (message: LeadLineMessageView) => void
  onDelete?: (message: LeadLineMessageView) => void
  onJumpToReply?: (messageId: string) => void
}

export function LeadLineChatMessageItem({
  message,
  formattedTime,
  canReply,
  canDelete,
  deleting = false,
  onReply,
  onDelete,
  onJumpToReply,
}: LeadLineChatMessageItemProps) {
  const isOutbound = message.direction === 'outbound'
  const isDeleted = Boolean(message.deleted_at)

  return (
    <li
      className={`crm-line-chat__msg crm-line-chat__msg--${message.direction}${isDeleted ? ' crm-line-chat__msg--deleted' : ''}`}
      data-message-id={message.id}
    >
      <div className="crm-line-chat__msg-inner">
        <span className="crm-line-chat__sender">{isOutbound ? 'ทีม' : 'ลูกค้า'}</span>

        {!isDeleted ? (
          <LeadLineReplyQuote
            message={message}
            onJump={
              message.reply_to_id && onJumpToReply
                ? () => onJumpToReply(message.reply_to_id!)
                : undefined
            }
          />
        ) : null}

        {isDeleted ? (
          <p className="crm-line-chat__deleted">ข้อความถูกลบแล้ว</p>
        ) : (
          <LeadLineMessageBody message={message} />
        )}

        <div className="crm-line-chat__msg-foot">
          <time className="crm-line-chat__time" dateTime={message.created_at}>
            {formattedTime}
          </time>
          <div className="crm-line-chat__msg-actions">
            {canReply && !isDeleted ? (
              <button
                type="button"
                className="crm-line-chat__msg-action"
                onClick={() => onReply(message)}
                aria-label="ตอบกลับข้อความนี้"
              >
                ตอบกลับ
              </button>
            ) : null}
            {canDelete && !isDeleted && onDelete ? (
              <button
                type="button"
                className="crm-line-chat__msg-action crm-line-chat__msg-action--danger"
                disabled={deleting}
                onClick={() => onDelete(message)}
                aria-label="ลบข้อความที่ส่ง"
              >
                {deleting ? '…' : 'ลบ'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  )
}
