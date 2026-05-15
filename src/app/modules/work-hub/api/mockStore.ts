import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { addDaysIso } from '../../timeline/constants'
import { applyWorkHubViewFilter } from './workHub'
import type { WorkHubFilters, WorkItem } from '../types'

const today = bangkokTodayIsoDate()

const MOCK: WorkItem[] = [
  {
    id: 'task-1',
    kind: 'task',
    at: `${addDaysIso(today, -1)}T09:00:00+07:00`,
    title: 'ตรวจรายงานแอดค้าง',
    detail: 'แบรนด์ตัวอย่าง · เลยกำหนด',
    link: '/app/tasks',
    overdue: true,
  },
  {
    id: 'lead-1',
    kind: 'lead_reminder',
    at: `${today}T14:00:00+07:00`,
    title: 'ติดตาม Lead — ร้าน B',
    detail: 'โทรกลับตามนัด',
    link: '/app/crm',
    overdue: false,
  },
  {
    id: 'notif-1',
    kind: 'notification',
    at: `${today}T08:30:00+07:00`,
    title: 'งานค้าง 3 รายการ',
    detail: 'ซิงก์จากระบบ',
    link: '/app/tasks',
    overdue: false,
  },
]

function sortMock(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    return a.at.localeCompare(b.at)
  })
}

export const mockWorkHubApi = {
  async list(filters: WorkHubFilters): Promise<WorkItem[]> {
    const limit = addDaysIso(today, filters.within_days)
    const lookback = addDaysIso(today, -filters.lookback_days)
    let rows = MOCK.filter((e) => {
      const day = e.at.slice(0, 10)
      if (e.kind === 'notification') return true
      if (day > limit || day < lookback) return false
      return true
    })
    if (filters.kind) rows = rows.filter((e) => e.kind === filters.kind)
    return sortMock(applyWorkHubViewFilter(rows, filters.view))
  },
}
