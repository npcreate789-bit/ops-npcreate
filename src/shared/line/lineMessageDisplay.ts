const MS_24H = 24 * 60 * 60 * 1000

export interface LineChatMessageForWindow {
  direction: 'inbound' | 'outbound'
  created_at: string
}

export interface LineReplyWindowStatus {
  withinWindow: boolean
  lastInboundAt: Date | null
  expiresAt: Date | null
}

export function getLineReplyWindowStatus(
  messages: LineChatMessageForWindow[],
): LineReplyWindowStatus {
  const inbound = [...messages]
    .filter((m) => m.direction === 'inbound')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const last = inbound.at(-1)
  if (!last) {
    return { withinWindow: true, lastInboundAt: null, expiresAt: null }
  }
  const lastInboundAt = new Date(last.created_at)
  const expiresAt = new Date(lastInboundAt.getTime() + MS_24H)
  return {
    withinWindow: Date.now() < expiresAt.getTime(),
    lastInboundAt,
    expiresAt,
  }
}

export function lineStickerImageUrl(stickerId: string | number | undefined): string | null {
  if (stickerId == null || stickerId === '') return null
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/ANDROID/sticker.png`
}

export function lineMessageTypeLabel(messageType: string): string {
  switch (messageType) {
    case 'text':
      return 'ข้อความ'
    case 'image':
      return 'รูปภาพ'
    case 'sticker':
      return 'สติกเกอร์'
    case 'audio':
      return 'เสียง'
    case 'video':
      return 'วิดีโอ'
    case 'file':
      return 'ไฟล์'
    case 'location':
      return 'ตำแหน่ง'
    default:
      return messageType
  }
}
