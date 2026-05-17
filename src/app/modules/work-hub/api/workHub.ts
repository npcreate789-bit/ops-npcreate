import { canAccessNotifications } from '../../../../shared/auth/access'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import type { AppRole } from '../../../../shared/types/roles'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listNotifications, syncNotifications } from '../../notifications/api/notifications'
import { fetchTimeline } from '../../timeline/api/timeline'
import { isDueTodayAt } from '../../timeline/constants'
import { canShowWorkKind, filterVisibleWorkItems } from '../access'
import type { WorkHubFilters, WorkHubSummary, WorkItem } from '../types'
import { mockWorkHubApi } from './mockStore'

function sortWorkItems(items: WorkItem[]): WorkItem[] {
  const today = bangkokTodayIsoDate()
  return [...items].sort((a, b) => {
    const score = (item: WorkItem) => {
      if (item.kind === 'client_chat') return 0
      if (item.kind === 'notification') return item.overdue ? 1 : 4
      if (item.kind === 'client_brief' && item.overdue) return 1
      if (item.overdue) return 2
      if (isDueTodayAt(item.at, today)) return 3
      return 4
    }
    const diff = score(a) - score(b)
    if (diff !== 0) return diff
    if (a.kind === 'notification' && b.kind === 'notification') {
      return b.at.localeCompare(a.at)
    }
    return a.at.localeCompare(b.at)
  })
}

export function applyWorkHubViewFilter(
  items: WorkItem[],
  view: WorkHubFilters['view'],
): WorkItem[] {
  const today = bangkokTodayIsoDate()
  if (view === 'overdue') {
    return items.filter((item) => item.overdue)
  }
  if (view === 'today') {
    return items.filter((item) => {
      if (item.kind === 'notification') {
        return item.at.slice(0, 10) === today
      }
      return !item.overdue && item.at.slice(0, 10) === today
    })
  }
  return items
}

export async function fetchWorkHub(
  userId: string,
  roles: AppRole[],
  filters: WorkHubFilters,
  configured: boolean,
): Promise<WorkItem[]> {
  if (!isSupabaseConfigured) {
    const rows = await mockWorkHubApi.list(filters)
    return filterVisibleWorkItems(
      applyWorkHubViewFilter(sortWorkItems(rows), filters.view),
      roles,
      configured,
    )
  }

  const items: WorkItem[] = []
  const includeTimeline =
    !filters.kind || filters.kind !== 'notification'

  if (includeTimeline) {
    const timeline = await fetchTimeline(userId, roles, {
      within_days: filters.within_days,
      lookback_days: filters.lookback_days,
      kind: filters.kind && filters.kind !== 'notification' ? filters.kind : '',
    })

    for (const row of timeline) {
      if (!canShowWorkKind(roles, row.kind)) continue
      items.push({
        id: row.id,
        kind: row.kind,
        at: row.at,
        title: row.title,
        detail: row.detail,
        link: row.link,
        overdue: row.overdue,
      })
    }
  }

  if (
    canAccessNotifications(roles) &&
    (!filters.kind || filters.kind === 'notification')
  ) {
    try {
      await syncNotifications(userId, roles)
      const notifications = await listNotifications(userId)
      for (const n of notifications.filter((x) => !x.read_at).slice(0, 25)) {
        if (!n.link) continue
        items.push({
          id: `notif-${n.id}`,
          kind: 'notification',
          at: n.created_at,
          title: n.title,
          detail: n.body,
          link: n.link,
          overdue: n.severity === 'danger',
        })
      }
    } catch {
      /* skip */
    }
  }

  let rows = sortWorkItems(items)
  if (filters.kind) {
    rows = rows.filter((item) => item.kind === filters.kind)
  }
  rows = applyWorkHubViewFilter(rows, filters.view)
  return filterVisibleWorkItems(rows, roles, configured)
}

export function buildWorkHubSummary(items: WorkItem[]): WorkHubSummary {
  const today = bangkokTodayIsoDate()
  return {
    total: items.length,
    overdue: items.filter((item) => item.overdue).length,
    due_today: items.filter(
      (item) => item.kind !== 'notification' && isDueTodayAt(item.at, today) && !item.overdue,
    ).length,
    unread_notifications: items.filter((item) => item.kind === 'notification').length,
  }
}
