import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { AppRole } from '../../../../shared/types/roles'
import { auditActionLabel } from '../../admin/constants'
import { filterActivityRowsForRoles } from '../../activity/access'
import { statusLabel } from '../../crm/constants'
import type { LeadStatus } from '../../crm/types'
import { contentStatusLabel } from '../../content/constants'
import type { ContentJobStatus } from '../../content/types'
import { paymentStatusLabel } from '../../finance/constants'
import type { PaymentStatus } from '../../finance/types'
import { renewalStatusLabel } from '../../renewals/constants'
import type { ContractRenewalStatus } from '../../renewals/types'
import { taskStatusLabel } from '../../tasks/constants'
import type { TaskStatus } from '../../tasks/types'
import { addDaysIso, isOverdueAt } from '../../timeline/constants'
import {
  canShowCustomer360TimelineKind,
  customer360TimelineKindsForContext,
  filterVisibleCustomerTimelineEntries,
} from '../access'
import { customerTimelineKindLabel } from '../constants'
import type {
  CustomerTimelineContext,
  CustomerTimelineEntry,
  CustomerTimelineFilters,
} from '../types'
import { mockCustomersApi } from './mockStore'

function inDateWindow(day: string, limitDay: string, lookbackDay: string): boolean {
  if (day > limitDay) return false
  if (day < lookbackDay) return false
  return true
}

function pushEntry(
  entries: CustomerTimelineEntry[],
  entry: Omit<CustomerTimelineEntry, 'overdue'> & { overdue?: boolean },
) {
  entries.push({
    ...entry,
    overdue: entry.overdue ?? isOverdueAt(entry.at),
  })
}

function filterAndSort(
  entries: CustomerTimelineEntry[],
  filters: CustomerTimelineFilters,
  roles: AppRole[],
  leadId: string | null,
): CustomerTimelineEntry[] {
  let rows = filterVisibleCustomerTimelineEntries(entries, roles, leadId)
  if (filters.kind) {
    rows = rows.filter((e) => e.kind === filters.kind)
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at))
}

export async function fetchCustomerTimeline(
  ctx: CustomerTimelineContext,
  roles: AppRole[],
  filters: CustomerTimelineFilters,
): Promise<CustomerTimelineEntry[]> {
  const kinds = customer360TimelineKindsForContext(roles, ctx.leadId)
  if (kinds.length === 0) {
    return []
  }

  if (!isSupabaseConfigured || !supabase) {
    return mockCustomersApi.listTimeline(ctx, roles, filters)
  }

  const today = bangkokTodayIsoDate()
  const limitDay = addDaysIso(today, filters.within_days)
  const lookbackDay = addDaysIso(today, -filters.lookback_days)
  const entries: CustomerTimelineEntry[] = []
  const { customerId, leadId, contractEnd, brandName } = ctx

  if (canShowCustomer360TimelineKind(roles, 'task')) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, due_at, updated_at')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false })
        .limit(40)
      if (error) throw error
      for (const row of data ?? []) {
        const at = (row.due_at as string) ?? (row.updated_at as string)
        if (!at) continue
        const day = at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        const status = row.status as TaskStatus
        pushEntry(entries, {
          id: `task-${row.id}`,
          kind: 'task',
          at,
          title: row.title as string,
          detail: taskStatusLabel(status),
          href: `/app/tasks/${row.id}`,
          overdue: status !== 'done' && isOverdueAt(at),
        })
      }
    } catch {
      /* RLS */
    }
  }

  if (canShowCustomer360TimelineKind(roles, 'payment')) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, status, total_amount, due_date, payment_date, updated_at')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false })
        .limit(30)
      if (error) throw error
      for (const row of data ?? []) {
        const at =
          (row.payment_date as string) ??
          (row.due_date as string) ??
          (row.updated_at as string)
        if (!at) continue
        const day = at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        const status = row.status as PaymentStatus
        pushEntry(entries, {
          id: `payment-${row.id}`,
          kind: 'payment',
          at,
          title: `การชำระ — ${Number(row.total_amount).toLocaleString('th-TH')} บาท`,
          detail: paymentStatusLabel(status),
          href: `/app/finance/payments/${row.id}`,
          overdue:
            status !== 'paid' &&
            status !== 'cancelled' &&
            Boolean(row.due_date) &&
            isOverdueAt(row.due_date as string),
        })
      }
    } catch {
      /* RLS */
    }
  }

  if (canShowCustomer360TimelineKind(roles, 'content')) {
    try {
      const { data, error } = await supabase
        .from('content_jobs')
        .select('id, title, status, due_at, updated_at')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false })
        .limit(30)
      if (error) throw error
      for (const row of data ?? []) {
        const at = (row.due_at as string) ?? (row.updated_at as string)
        if (!at) continue
        const day = at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        const status = row.status as ContentJobStatus
        pushEntry(entries, {
          id: `content-${row.id}`,
          kind: 'content',
          at,
          title: row.title as string,
          detail: contentStatusLabel(status),
          href: `/app/content/${row.id}`,
          overdue: status !== 'delivered' && status !== 'cancelled' && isOverdueAt(at),
        })
      }
    } catch {
      /* RLS */
    }
  }

  if (canShowCustomer360TimelineKind(roles, 'contract') && contractEnd) {
    const day = contractEnd
    if (inDateWindow(day, limitDay, lookbackDay)) {
      try {
        const { data } = await supabase
          .from('contract_renewals')
          .select('status')
          .eq('customer_id', customerId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const status = data?.status as ContractRenewalStatus | null | undefined
        pushEntry(entries, {
          id: `contract-${customerId}`,
          kind: 'contract',
          at: contractEnd,
          title: `สิ้นสุดสัญญา — ${brandName}`,
          detail: status ? renewalStatusLabel(status) : 'สัญญา',
          href: '/app/renewals',
          overdue: isOverdueAt(contractEnd),
        })
      } catch {
        pushEntry(entries, {
          id: `contract-${customerId}`,
          kind: 'contract',
          at: contractEnd,
          title: `สิ้นสุดสัญญา — ${brandName}`,
          detail: 'สัญญา',
          href: '/app/renewals',
          overdue: isOverdueAt(contractEnd),
        })
      }
    }
  }

  if (canShowCustomer360TimelineKind(roles, 'lead') && leadId) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, brand_name, reminder_at, updated_at, status')
        .eq('id', leadId)
        .maybeSingle()
      if (error) throw error
      if (data) {
        const at = (data.reminder_at as string) ?? (data.updated_at as string)
        if (at) {
          const day = at.slice(0, 10)
          if (inDateWindow(day, limitDay, lookbackDay)) {
            pushEntry(entries, {
              id: `lead-${data.id}`,
              kind: 'lead',
              at,
              title: `Lead — ${data.brand_name as string}`,
              detail: statusLabel(data.status as LeadStatus),
              href: `/app/crm/${data.id}`,
              overdue: Boolean(data.reminder_at) && isOverdueAt(data.reminder_at as string),
            })
          }
        }
      }
    } catch {
      /* RLS */
    }
  }

  if (canShowCustomer360TimelineKind(roles, 'activity')) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, metadata, created_at, actor_id')
        .or(
          `and(entity_type.eq.customer,entity_id.eq.${customerId}),metadata->>customer_id.eq.${customerId}`,
        )
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      const filtered = filterActivityRowsForRoles(
        (data ?? []).map((row) => ({
          id: row.id as string,
          action: row.action as string,
          entity_type: row.entity_type as string,
          entity_id: row.entity_id as string | null,
          metadata: (row.metadata as Record<string, unknown>) ?? {},
          created_at: row.created_at as string,
          actor_id: (row.actor_id as string | null) ?? null,
          actor_email: null,
          actor_name: null,
        })),
        roles,
      )
      for (const row of filtered) {
        const day = row.created_at.slice(0, 10)
        if (!inDateWindow(day, limitDay, lookbackDay)) continue
        pushEntry(entries, {
          id: `activity-${row.id}`,
          kind: 'activity',
          at: row.created_at,
          title: auditActionLabel(row.action),
          detail: row.entity_type,
          href: '/app/activity',
        })
      }
    } catch {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, action, entity_type, entity_id, metadata, created_at, actor_id')
          .eq('entity_type', 'customer')
          .eq('entity_id', customerId)
          .order('created_at', { ascending: false })
          .limit(25)
        if (error) throw error
        const filtered = filterActivityRowsForRoles(
          (data ?? []).map((row) => ({
            id: row.id as string,
            action: row.action as string,
            entity_type: row.entity_type as string,
            entity_id: row.entity_id as string | null,
            metadata: (row.metadata as Record<string, unknown>) ?? {},
            created_at: row.created_at as string,
            actor_id: (row.actor_id as string | null) ?? null,
            actor_email: null,
            actor_name: null,
          })),
          roles,
        )
        for (const row of filtered) {
          const day = row.created_at.slice(0, 10)
          if (!inDateWindow(day, limitDay, lookbackDay)) continue
          pushEntry(entries, {
            id: `activity-${row.id}`,
            kind: 'activity',
            at: row.created_at,
            title: auditActionLabel(row.action),
            detail: row.entity_type,
            href: '/app/activity',
          })
        }
      } catch {
        /* RLS */
      }
    }
  }

  return filterAndSort(entries, filters, roles, leadId)
}

export function buildCustomerTimelineSummary(entries: CustomerTimelineEntry[]) {
  return {
    total: entries.length,
    overdue: entries.filter((e) => e.overdue).length,
  }
}

export { customerTimelineKindLabel }
