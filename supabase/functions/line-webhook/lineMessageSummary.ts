export interface LineInboundMessage {
  type: string
  id?: string
  text?: string
  packageId?: string
  stickerId?: string
  fileName?: string
  title?: string
  address?: string
  latitude?: number
  longitude?: number
  duration?: number
}

export interface SummarizedLineMessage {
  body: string
  message_type: string
  metadata: Record<string, unknown>
}

export function summarizeLineInboundMessage(msg: LineInboundMessage): SummarizedLineMessage | null {
  switch (msg.type) {
    case 'text': {
      const text = msg.text?.trim()
      if (!text) return null
      return { body: text, message_type: 'text', metadata: {} }
    }
    case 'image':
      return {
        body: '[รูปภาพ]',
        message_type: 'image',
        metadata: { line_content_message_id: msg.id ?? null },
      }
    case 'sticker':
      return {
        body: '[สติกเกอร์]',
        message_type: 'sticker',
        metadata: {
          packageId: msg.packageId ?? null,
          stickerId: msg.stickerId ?? null,
        },
      }
    case 'audio':
      return {
        body: '[ข้อความเสียง]',
        message_type: 'audio',
        metadata: {
          line_content_message_id: msg.id ?? null,
          durationMs: msg.duration ?? null,
        },
      }
    case 'video':
      return {
        body: '[วิดีโอ]',
        message_type: 'video',
        metadata: { line_content_message_id: msg.id ?? null },
      }
    case 'file':
      return {
        body: msg.fileName?.trim() ? `[ไฟล์] ${msg.fileName.trim()}` : '[ไฟล์]',
        message_type: 'file',
        metadata: {
          line_content_message_id: msg.id ?? null,
          fileName: msg.fileName ?? null,
        },
      }
    case 'location': {
      const place = msg.title?.trim() || msg.address?.trim()
      const coords =
        msg.latitude != null && msg.longitude != null
          ? `${msg.latitude},${msg.longitude}`
          : null
      const body = place ? `[ตำแหน่ง] ${place}` : coords ? `[ตำแหน่ง] ${coords}` : '[ตำแหน่ง]'
      return {
        body,
        message_type: 'location',
        metadata: {
          title: msg.title ?? null,
          address: msg.address ?? null,
          latitude: msg.latitude ?? null,
          longitude: msg.longitude ?? null,
        },
      }
    }
    default:
      return {
        body: `[${msg.type}]`,
        message_type: msg.type,
        metadata: { line_message_id: msg.id ?? null },
      }
  }
}
