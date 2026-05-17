import { bangkokTodayIsoDate } from '../../../shared/dates/bangkok'
import type { TimelineKind } from './types'

export const TIMELINE_KIND_OPTIONS: { value: TimelineKind | ''; label: string }[] = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'task', label: 'งานภายใน' },
  { value: 'contract_end', label: 'สัญญาสิ้นสุด' },
  { value: 'lead_reminder', label: 'ติดตาม Lead' },
  { value: 'payment_due', label: 'ครบกำหนดชำระ' },
  { value: 'client_chat', label: 'แชทลูกค้า' },
  { value: 'client_brief', label: 'บรีฟลูกค้า' },
]

export const TIMELINE_WITHIN_OPTIONS = [
  { value: 14, label: 'ล่วงหน้า 14 วัน' },
  { value: 30, label: 'ล่วงหน้า 30 วัน' },
  { value: 60, label: 'ล่วงหน้า 60 วัน' },
]

export const TIMELINE_LOOKBACK_OPTIONS = [
  { value: 7, label: 'ย้อนหลัง 7 วัน' },
  { value: 30, label: 'ย้อนหลัง 30 วัน' },
  { value: 90, label: 'ย้อนหลัง 90 วัน' },
]

export function timelineKindLabel(kind: TimelineKind): string {
  return TIMELINE_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00+07:00`)
  d.setDate(d.getDate() + days)
  return bangkokTodayIsoDate(d)
}

export function isOverdueAt(at: string, today = bangkokTodayIsoDate()): boolean {
  const day = at.length > 10 ? at.slice(0, 10) : at
  return day < today
}

export function isDueTodayAt(at: string, today = bangkokTodayIsoDate()): boolean {
  const day = at.length > 10 ? at.slice(0, 10) : at
  return day === today
}
