import type { TimelineKind } from '../timeline/types'

export type WorkItemKind = TimelineKind | 'notification'

export type WorkItemFilter = WorkItemKind | ''

export interface WorkItem {
  id: string
  kind: WorkItemKind
  at: string
  title: string
  detail: string
  link: string
  overdue: boolean
}

export interface WorkHubFilters {
  within_days: number
  lookback_days: number
  kind: WorkItemFilter
  view: 'all' | 'overdue' | 'today'
}

export interface WorkHubSummary {
  total: number
  overdue: number
  due_today: number
  unread_notifications: number
}
