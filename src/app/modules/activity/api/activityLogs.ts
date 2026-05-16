import type { AppRole } from '../../../../shared/types/roles'
import {
  listActivityActors,
  listAuditLogs,
  type ActivityActorOption,
  type AuditLogRow,
  type ListAuditFilters,
} from '../../admin/api/auditLogs'
import { filterActivityRowsForRoles } from '../access'
import type { ActivityFilters } from '../types'

export type { AuditLogRow as ActivityLogRow, ActivityActorOption }

export { listActivityActors }

function toListFilters(filters: ActivityFilters): ListAuditFilters {
  return {
    actor_id: filters.actor_id || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    action_prefix: filters.action_prefix || undefined,
    entity_type: filters.entity_type || undefined,
    limit: 200,
  }
}

export async function listActivityLogs(
  filters: ActivityFilters,
  roles: AppRole[] = [],
): Promise<AuditLogRow[]> {
  let rows = filterActivityRowsForRoles(await listAuditLogs(toListFilters(filters)), roles)

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    rows = rows.filter((r) => {
      const hay = [
        r.action,
        r.entity_type,
        r.entity_id,
        r.actor_email,
        r.actor_name,
        JSON.stringify(r.metadata),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }

  return rows
}

export function activityEntityTypes(rows: AuditLogRow[]): string[] {
  return [...new Set(rows.map((r) => r.entity_type))].sort()
}
