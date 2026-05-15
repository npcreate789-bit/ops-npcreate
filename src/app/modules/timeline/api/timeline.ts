import { hasTasksTeamView } from '../../../../shared/auth/access'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import type { AppRole } from '../../../../shared/types/roles'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { listLeads } from '../../crm/api/leads'
import { listPayments } from '../../finance/api/payments'
import { listRenewalRows } from '../../renewals/api/renewals'
import { renewalStatusLabel } from '../../renewals/constants'
import { listTasks } from '../../tasks/api/tasks'
import { isTaskOverdue } from '../../tasks/constants'
import { canShowTimelineKind } from '../access'
import { addDaysIso, isDueTodayAt, isOverdueAt } from '../constants'
import type { TimelineEntry, TimelineFilters, TimelineSummary } from '../types'
import { mockTimelineApi } from './mockStore'

function pushEntry(
  entries: TimelineEntry[],
  entry: Omit<TimelineEntry, 'overdue'> & { overdue?: boolean },
) {
  entries.push({
    ...entry,
    overdue: entry.overdue ?? isOverdueAt(entry.at),
  })
}

function inDateWindow(day: string, limitDay: string, lookbackDay: string): boolean {
  if (day > limitDay) return false
  if (day < lookbackDay) return false
  return true
}

export async function fetchTimeline(
  userId: string,
  roles: AppRole[],
  filters: TimelineFilters,
): Promise<TimelineEntry[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockTimelineApi.list(filters)
  }

  const today = bangkokTodayIsoDate()
  const limitDay = addDaysIso(today, filters.within_days)
  const lookbackDay = addDaysIso(today, -filters.lookback_days)
  const entries: TimelineEntry[] = []
  const teamTasks = hasTasksTeamView(roles)

  if (canShowTimelineKind(roles, 'task')) {
    try {
      const tasks = await listTasks(userId, { scope: teamTasks ? 'all' : 'mine' }, teamTasks)
      for (const t of tasks) {
        if (!t.due_at || t.status === 'done') continue
        const day = t.due_at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        pushEntry(entries, {
          id: `task-${t.id}`,
          kind: 'task',
          at: t.due_at,
          title: t.title,
          detail: [t.customer_brand_name, t.assignee_name].filter(Boolean).join(' · ') || 'งานภายใน',
          link: `/app/tasks/${t.id}`,
          overdue: isTaskOverdue(t.due_at, t.status),
        })
      }
    } catch {
      /* RLS หรือไม่มีสิทธิ์ — ข้าม */
    }
  }

  if (canShowTimelineKind(roles, 'contract_end')) {
    try {
      const renewals = await listRenewalRows({
        within_days: filters.within_days,
        include_expired: true,
      })
      for (const r of renewals) {
        if (!r.contract_end) continue
        const day = r.contract_end
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        pushEntry(entries, {
          id: `contract-${r.customer_id}`,
          kind: 'contract_end',
          at: r.contract_end,
          title: `สัญญาสิ้นสุด — ${r.brand_name}`,
          detail: renewalStatusLabel(r.renewal_status),
          link: '/app/renewals',
        })
      }
    } catch {
      /* skip */
    }
  }

  if (canShowTimelineKind(roles, 'lead_reminder')) {
    try {
      const leads = await listLeads({ status: 'all' })
      for (const l of leads) {
        if (!l.reminder_at) continue
        const day = l.reminder_at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        pushEntry(entries, {
          id: `lead-${l.id}`,
          kind: 'lead_reminder',
          at: l.reminder_at,
          title: `ติดตาม Lead — ${l.brand_name}`,
          detail: l.contact_name ?? l.phone ?? 'CRM',
          link: `/app/crm/${l.id}`,
        })
      }
    } catch {
      /* skip */
    }
  }

  if (canShowTimelineKind(roles, 'payment_due')) {
    try {
      const payments = await listPayments()
      for (const p of payments) {
        if (!p.due_date || p.status === 'paid' || p.status === 'cancelled') continue
        const day = p.due_date
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        pushEntry(entries, {
          id: `payment-${p.id}`,
          kind: 'payment_due',
          at: p.due_date,
          title: `ครบกำหนดชำระ — ${p.customer_brand_name ?? 'ลูกค้า'}`,
          detail: `${p.total_amount.toLocaleString('th-TH')} บาท · ${p.status}`,
          link: `/app/finance/payments/${p.id}`,
        })
      }
    } catch {
      /* skip */
    }
  }

  let rows = entries.sort((a, b) => a.at.localeCompare(b.at))
  if (filters.kind) {
    rows = rows.filter((e) => e.kind === filters.kind)
  }
  return rows
}

export function buildTimelineSummary(entries: TimelineEntry[]): TimelineSummary {
  const today = bangkokTodayIsoDate()
  return {
    total: entries.length,
    overdue: entries.filter((e) => e.overdue).length,
    due_today: entries.filter((e) => isDueTodayAt(e.at, today)).length,
  }
}
