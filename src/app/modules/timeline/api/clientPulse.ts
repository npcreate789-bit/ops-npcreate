import { canViewChatHub } from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listChatInbox } from '../../chat/api/chat'
import { listOnboardingCustomers } from '../../onboarding/api/onboarding'
import { canShowTimelineKind } from '../access'
import { addDaysIso, isOverdueAt } from '../constants'
import type { TimelineEntry, TimelineFilters } from '../types'

function inDateWindow(day: string, limitDay: string, lookbackDay: string): boolean {
  if (day > limitDay) return false
  if (day < lookbackDay) return false
  return true
}

function pushEntry(
  entries: TimelineEntry[],
  entry: Omit<TimelineEntry, 'overdue'> & { overdue?: boolean },
) {
  entries.push({
    ...entry,
    overdue: entry.overdue ?? isOverdueAt(entry.at),
  })
}

export async function fetchClientPulseEntries(
  userId: string,
  roles: AppRole[],
  filters: TimelineFilters,
): Promise<TimelineEntry[]> {
  const entries: TimelineEntry[] = []
  const today = bangkokTodayIsoDate()
  const limitDay = addDaysIso(today, filters.within_days)
  const lookbackDay = addDaysIso(today, -filters.lookback_days)

  if (canShowTimelineKind(roles, 'client_chat') && canViewChatHub(roles)) {
    try {
      const inbox = await listChatInbox(userId)
      for (const row of inbox) {
        if (row.channel !== 'client' || row.unread_count <= 0) continue
        const at = row.last_message_at ?? today
        const day = at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        const preview = row.last_message_body?.trim()
        pushEntry(entries, {
          id: `client-chat-${row.project_id}`,
          kind: 'client_chat',
          at,
          title: `แชทลูกค้า — ${row.brand_name || row.project_name}`,
          detail: preview
            ? `${preview.slice(0, 80)}${preview.length > 80 ? '…' : ''} · ${row.unread_count} ยังไม่อ่าน`
            : `${row.unread_count} ข้อความยังไม่อ่าน`,
          link: `/app/chat?project=${row.project_id}&channel=client`,
          overdue: true,
        })
      }
    } catch {
      /* skip */
    }
  }

  if (canShowTimelineKind(roles, 'client_brief')) {
    try {
      const customers = await listOnboardingCustomers()
      for (const c of customers) {
        if (c.ready_for_ads) continue
        const at = today
        if (!inDateWindow(at, limitDay, lookbackDay)) continue
        pushEntry(entries, {
          id: `client-brief-${c.id}`,
          kind: 'client_brief',
          at,
          title: `บรีฟยังไม่ครบ — ${c.brand_name}`,
          detail: `ความคืบหน้า ${c.progress}%${c.has_form ? ' · มีฟอร์มแล้ว' : ' · ยังไม่ส่งฟอร์ม'}`,
          link: `/app/onboarding/${c.id}`,
          overdue: c.progress < 50,
        })
      }
    } catch {
      /* skip */
    }
  }

  if (!isSupabaseConfigured && entries.length === 0) {
    pushEntry(entries, {
      id: 'client-chat-demo',
      kind: 'client_chat',
      at: `${today}T11:00:00+07:00`,
      title: 'แชทลูกค้า — แบรนด์ Demo',
      detail: 'ข้อความใหม่จากลูกค้า · 1 ยังไม่อ่าน',
      link: '/app/chat?project=demo-project&channel=client',
      overdue: true,
    })
  }

  return entries
}
