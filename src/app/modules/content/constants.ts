import type { ContentFormat, ContentJobStatus } from './types'

export const CONTENT_STATUS_OPTIONS: { value: ContentJobStatus; label: string }[] = [
  { value: 'briefed', label: 'รับบรีฟแล้ว' },
  { value: 'in_production', label: 'กำลังผลิต' },
  { value: 'review', label: 'รอตรวจ' },
  { value: 'delivered', label: 'ส่งมอบแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
]

export const CONTENT_FORMAT_OPTIONS: { value: ContentFormat; label: string }[] = [
  { value: 'short_clip', label: 'คลิปสั้น' },
  { value: 'live_clip', label: 'คลิปไลฟ์' },
  { value: 'graphic', label: 'กราฟิก' },
  { value: 'ugc', label: 'UGC' },
  { value: 'other', label: 'อื่น ๆ' },
]

export function contentStatusLabel(s: ContentJobStatus): string {
  return CONTENT_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
}

export function contentFormatLabel(f: ContentFormat): string {
  return CONTENT_FORMAT_OPTIONS.find((o) => o.value === f)?.label ?? f
}

export function isContentOverdue(dueAt: string | null, status: ContentJobStatus): boolean {
  if (!dueAt || status === 'delivered' || status === 'cancelled') return false
  return new Date(dueAt) < new Date()
}
