import type { ChatMessage, ChatReplyTarget } from '../types'

export function messageToReplyTarget(message: ChatMessage): ChatReplyTarget {
  return {
    id: message.id,
    sender_id: message.sender_id,
    sender_name: message.sender_name ?? null,
    message_type: message.message_type,
    body: message.body,
    attachment_name: message.attachment_name,
  }
}

export function replyTargetPreviewText(target: ChatReplyTarget, maxLen = 120): string {
  if (target.message_type === 'file') {
    const label = target.attachment_name?.trim() || target.body.trim() || 'ไฟล์'
    return `📎 ${label}`.slice(0, maxLen)
  }
  const text = target.body.trim()
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1)}…`
}

export function replyTargetSenderLabel(target: ChatReplyTarget, mine: boolean): string {
  if (mine) return 'คุณ'
  return target.sender_name?.trim() || 'ทีมงาน'
}

export function chatMessagePreviewText(message: ChatMessage, maxLen = 120): string {
  if (message.message_type === 'file') {
    const label = message.attachment_name?.trim() || message.body.trim() || 'ไฟล์'
    return `📎 ${label}`.slice(0, maxLen)
  }
  if (message.message_type === 'system') {
    return message.body.slice(0, maxLen)
  }
  const text = message.body.trim()
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen - 1)}…`
}

export function attachReplyPreviews(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map(messages.map((m) => [m.id, m]))
  return messages.map((m) => {
    if (!m.reply_to_id) return m
    const parent = byId.get(m.reply_to_id)
    if (!parent) return m
    return {
      ...m,
      reply_to_sender_id: parent.sender_id,
      reply_to_sender_name: parent.sender_name ?? null,
      reply_to_message_type: parent.message_type,
      reply_to_body: chatMessagePreviewText(parent),
    }
  })
}
