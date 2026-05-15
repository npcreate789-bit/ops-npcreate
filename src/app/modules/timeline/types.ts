export type TimelineKind = 'task' | 'contract_end' | 'lead_reminder' | 'payment_due'

export interface TimelineEntry {
  id: string
  kind: TimelineKind
  at: string
  title: string
  detail: string
  link: string
  overdue: boolean
}

export interface TimelineFilters {
  within_days: number
  /** รวมรายการเลยกำหนดย้อนหลัง (วัน) */
  lookback_days: number
  kind: TimelineKind | ''
}

export interface TimelineSummary {
  total: number
  overdue: number
  due_today: number
}
