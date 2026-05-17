import type { ChatMessage, ChatReadReceipt } from '../types'

export function readersForMessage(
  message: ChatMessage,
  readReceipts: ChatReadReceipt[],
): ChatReadReceipt[] {
  const created = new Date(message.created_at).getTime()
  return readReceipts.filter((r) => new Date(r.last_read_at).getTime() >= created)
}

export function formatReadReceiptLabel(readers: ChatReadReceipt[]): string | null {
  if (readers.length === 0) return null
  if (readers.length === 1) {
    return `อ่านแล้ว · ${readers[0].full_name}`
  }
  if (readers.length <= 3) {
    return `อ่านแล้ว · ${readers.map((r) => r.full_name).join(', ')}`
  }
  return `อ่านแล้ว · ${readers.length} คน`
}
