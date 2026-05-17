import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'

const BANGKOK = 'Asia/Bangkok'

function bangkokDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK }).format(new Date(iso))
}

function bangkokTodayKey(): string {
  return bangkokDateKey(new Date().toISOString())
}

export function chatInitials(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

export function avatarHue(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = (h + seed.charCodeAt(i) * 17) % 360
  }
  return h
}

export function formatChatListTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'เมื่อกี้'
  if (diffMin < 60) return `${diffMin} น.`
  if (bangkokDateKey(iso) === bangkokTodayKey()) {
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BANGKOK,
    }).format(date)
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (bangkokDateKey(iso) === bangkokDateKey(yesterday.toISOString())) {
    return 'เมื่อวาน'
  }

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: BANGKOK,
  }).format(date)
}

export function formatChatBubbleTime(iso: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BANGKOK,
  }).format(new Date(iso))
}

export function chatDayLabel(iso: string): string {
  const key = bangkokDateKey(iso)
  const today = bangkokTodayKey()
  if (key === today) return 'วันนี้'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === bangkokDateKey(yesterday.toISOString())) return 'เมื่อวาน'

  return formatBangkokDate(iso.slice(0, 10))
}

export interface ChatDayGroup {
  dayKey: string
  label: string
  messages: import('../types').ChatMessage[]
}

export function groupMessagesByDay(
  messages: import('../types').ChatMessage[],
): ChatDayGroup[] {
  const map = new Map<string, ChatDayGroup>()
  for (const message of messages) {
    const dayKey = bangkokDateKey(message.created_at)
    const existing = map.get(dayKey)
    if (existing) {
      existing.messages.push(message)
    } else {
      map.set(dayKey, {
        dayKey,
        label: chatDayLabel(message.created_at),
        messages: [message],
      })
    }
  }
  return [...map.values()]
}

export function truncatePreview(text: string | null | undefined, max = 56): string {
  if (!text) return ''
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= max) return oneLine
  return `${oneLine.slice(0, max - 1)}…`
}

export function messageMatchesSearch(
  message: import('../types').ChatMessage,
  query: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = [
    message.body,
    message.sender_name ?? '',
    message.attachment_name ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

export function formatFullTimestamp(iso: string): string {
  return formatBangkokDateTime(iso)
}
