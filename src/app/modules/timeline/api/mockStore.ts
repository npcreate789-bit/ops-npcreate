import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { addDaysIso } from '../constants'
import type { TimelineEntry, TimelineFilters } from '../types'

const today = bangkokTodayIsoDate()

const MOCK: TimelineEntry[] = [
  {
    id: 'task-1',
    kind: 'task',
    at: `${addDaysIso(today, 2)}T17:00:00+07:00`,
    title: 'ส่งรายงานแอดรายสัปดาห์',
    detail: 'แบรนด์ตัวอย่าง · ความสำคัญสูง',
    link: '/app/tasks',
    overdue: false,
  },
  {
    id: 'contract-1',
    kind: 'contract_end',
    at: addDaysIso(today, 12),
    title: 'สัญญาสิ้นสุด — แบรนด์ A',
    detail: 'สถานะ active',
    link: '/app/renewals',
    overdue: false,
  },
  {
    id: 'lead-1',
    kind: 'lead_reminder',
    at: `${today}T10:00:00+07:00`,
    title: 'ติดตาม Lead — ร้าน B',
    detail: 'โทรกลับตามนัด',
    link: '/app/crm',
    overdue: false,
  },
]

export const mockTimelineApi = {
  async list(filters: TimelineFilters): Promise<TimelineEntry[]> {
    const limit = addDaysIso(today, filters.within_days)
    const lookback = addDaysIso(today, -(filters.lookback_days ?? 30))
    return MOCK.filter((e) => {
      const day = e.at.slice(0, 10)
      if (day > limit || day < lookback) return false
      if (filters.kind && e.kind !== filters.kind) return false
      return true
    }).sort((a, b) => a.at.localeCompare(b.at))
  },
}
