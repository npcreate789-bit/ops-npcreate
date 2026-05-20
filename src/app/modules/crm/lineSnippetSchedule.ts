import { bangkokTodayIsoDate, formatBangkokDate } from '../../../shared/dates/bangkok'
import type { LineMessageSnippet } from './types/lineSnippets'

export type LineSnippetScheduleStatus = 'active' | 'inactive' | 'scheduled' | 'expired'

export function isLineSnippetCurrentlyValid(
  snippet: Pick<LineMessageSnippet, 'is_active' | 'valid_from' | 'valid_until'>,
  today = bangkokTodayIsoDate(),
): boolean {
  if (!snippet.is_active) return false
  if (snippet.valid_from && snippet.valid_from > today) return false
  if (snippet.valid_until && snippet.valid_until < today) return false
  return true
}

export function lineSnippetScheduleStatus(
  snippet: Pick<LineMessageSnippet, 'is_active' | 'valid_from' | 'valid_until'>,
  today = bangkokTodayIsoDate(),
): LineSnippetScheduleStatus {
  if (!snippet.is_active) return 'inactive'
  if (snippet.valid_from && snippet.valid_from > today) return 'scheduled'
  if (snippet.valid_until && snippet.valid_until < today) return 'expired'
  return 'active'
}

export const LINE_SNIPPET_SCHEDULE_LABELS: Record<LineSnippetScheduleStatus, string> = {
  active: 'ใช้งาน',
  inactive: 'ปิด',
  scheduled: 'รอเริ่ม',
  expired: 'หมดอายุ',
}

export function formatLineSnippetValidity(
  snippet: Pick<LineMessageSnippet, 'valid_from' | 'valid_until'>,
): string {
  if (!snippet.valid_from && !snippet.valid_until) return 'ตลอดเวลา'
  if (snippet.valid_from && snippet.valid_until) {
    return `${formatBangkokDate(snippet.valid_from)} – ${formatBangkokDate(snippet.valid_until)}`
  }
  if (snippet.valid_from) return `ตั้งแต่ ${formatBangkokDate(snippet.valid_from)}`
  return `ถึง ${formatBangkokDate(snippet.valid_until)}`
}
