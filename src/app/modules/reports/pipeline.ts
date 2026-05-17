import type { ReportInsight } from './types'

export type ReportsFocusFilter = 'all' | 'finance' | 'ads' | 'operations'

export const REPORTS_FOCUS_FILTERS: {
  value: ReportsFocusFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'คำแนะนำทุกหมวด' },
  { value: 'finance', label: 'การเงิน', hint: 'รายรับ · ลูกหนี้' },
  { value: 'ads', label: 'ยิงแอด', hint: 'Spend · ROI' },
  { value: 'operations', label: 'ปฏิบัติการ', hint: 'สัญญา · งาน · คอนเทนต์' },
]

export function matchesReportsFocus(
  insight: ReportInsight,
  filter: ReportsFocusFilter,
): boolean {
  if (filter === 'all') return true
  return insight.focus === filter
}
