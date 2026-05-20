import { lineMessageTypeLabel } from '../../../shared/line/lineMessageDisplay'
import type { LeadLineMessage, LeadLineMessageView } from './types/leadLineChat'

export interface LineChatReplyMeta {
  reply_to_id?: string
  reply_preview: string
  reply_from: 'inbound' | 'outbound'
  quoted_line_message_id?: string
}

const FALLBACK_OUTBOUND_REPLY_PREVIEW = 'ข้อความจากทีม (LINE)'

export function lineChatMessagePreview(message: LeadLineMessage, maxLen = 120): string {
  if (message.deleted_at) return 'ข้อความถูกลบแล้ว'
  if (message.message_type === 'text') {
    const t = message.body.trim()
    return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
  }
  if (message.message_type === 'image') return 'รูปภาพ'
  if (message.message_type === 'sticker') return 'สติกเกอร์'
  return message.body.trim() || lineMessageTypeLabel(message.message_type)
}

export function lineChatReplyMeta(message: LeadLineMessage): LineChatReplyMeta {
  return {
    reply_to_id: message.id,
    reply_preview: lineChatMessagePreview(message, 100),
    reply_from: message.direction,
  }
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  const v = metadata?.[key]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/** อ่าน metadata ตอบกลับ — รองรับทั้งแบบเต็มและมีแค่ quoted_line_message_id */
export function extractLineChatReplyMeta(
  metadata: Record<string, unknown> | null | undefined,
): LineChatReplyMeta | null {
  if (!metadata || typeof metadata !== 'object') return null

  const quotedLineId = readMetadataString(metadata, 'quoted_line_message_id')
  const replyToId = readMetadataString(metadata, 'reply_to_id')
  const preview = readMetadataString(metadata, 'reply_preview')
  const fromRaw = metadata.reply_from

  if (!quotedLineId && !replyToId) return null

  const reply_from: 'inbound' | 'outbound' =
    fromRaw === 'inbound' || fromRaw === 'outbound' ? fromRaw : 'outbound'

  return {
    reply_to_id: replyToId,
    quoted_line_message_id: quotedLineId,
    reply_preview: preview ?? (reply_from === 'outbound' ? FALLBACK_OUTBOUND_REPLY_PREVIEW : 'ข้อความจากลูกค้า'),
    reply_from,
  }
}

/** @deprecated ใช้ extractLineChatReplyMeta */
export function parseLineChatReplyMeta(
  metadata: Record<string, unknown> | null | undefined,
): LineChatReplyMeta | null {
  return extractLineChatReplyMeta(metadata)
}

/** ป้ายชื่อผู้ส่งข้อความที่ถูกอ้างอิง — แบบ LINE OA */
export function lineChatReplySenderLabel(from: 'inbound' | 'outbound'): string {
  return from === 'inbound' ? 'ลูกค้า' : 'ทีม'
}

export function enrichLeadLineMessages(messages: LeadLineMessage[]): LeadLineMessageView[] {
  const byId = new Map(messages.map((m) => [m.id, m]))
  const byLineId = new Map(
    messages
      .filter((m) => m.line_message_id)
      .map((m) => [m.line_message_id as string, m]),
  )

  return messages.map((message) => {
    const base: LeadLineMessageView = { ...message }
    const meta = extractLineChatReplyMeta(message.metadata)
    if (!meta) return base

    let parent: LeadLineMessage | undefined
    if (meta.reply_to_id) parent = byId.get(meta.reply_to_id)
    if (!parent && meta.quoted_line_message_id) {
      parent = byLineId.get(meta.quoted_line_message_id)
    }

    if (parent) {
      base.reply_to_id = parent.id
      base.reply_to_from = parent.direction
      base.reply_to_body = lineChatMessagePreview(parent, 120)
      base.reply_to_message_type = parent.message_type
    } else {
      base.reply_to_id = meta.reply_to_id ?? meta.quoted_line_message_id
      base.reply_to_from = meta.reply_from
      base.reply_to_body = meta.reply_preview
    }

    return base
  })
}
