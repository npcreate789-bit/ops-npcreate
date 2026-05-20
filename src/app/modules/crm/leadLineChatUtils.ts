import { lineMessageTypeLabel } from '../../../shared/line/lineMessageDisplay'
import type { LeadLineMessage } from './types/leadLineChat'

export interface LineChatReplyMeta {
  reply_to_id: string
  reply_preview: string
  reply_from: 'inbound' | 'outbound'
}

export function lineChatMessagePreview(message: LeadLineMessage, maxLen = 120): string {
  if (message.message_type === 'text') {
    const t = message.body.trim()
    return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
  }
  return message.body.trim() || lineMessageTypeLabel(message.message_type)
}

export function lineChatReplyMeta(message: LeadLineMessage): LineChatReplyMeta {
  return {
    reply_to_id: message.id,
    reply_preview: lineChatMessagePreview(message, 100),
    reply_from: message.direction,
  }
}

export function parseLineChatReplyMeta(
  metadata: Record<string, unknown> | null | undefined,
): LineChatReplyMeta | null {
  if (!metadata || typeof metadata !== 'object') return null
  const id = metadata.reply_to_id
  const preview = metadata.reply_preview
  const from = metadata.reply_from
  if (typeof id !== 'string' || typeof preview !== 'string') return null
  if (from !== 'inbound' && from !== 'outbound') return null
  return { reply_to_id: id, reply_preview: preview, reply_from: from }
}

export function buildOutboundLineText(text: string, replyTo?: LeadLineMessage | null): string {
  const trimmed = text.trim()
  if (!replyTo) return trimmed
  const label = replyTo.direction === 'inbound' ? 'ลูกค้า' : 'ทีม'
  const quote = lineChatMessagePreview(replyTo, 80).replace(/\n/g, ' ')
  return `【ตอบกลับ ${label}】${quote}\n\n${trimmed}`
}
