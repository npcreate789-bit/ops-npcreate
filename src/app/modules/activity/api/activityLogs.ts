import type { AppRole } from '../../../../shared/types/roles'
import { listAuditLogs, type AuditLogRow } from '../../admin/api/auditLogs'
import { filterActivityRowsForRoles } from '../access'
import type { ActivityFilters } from '../types'

export type { AuditLogRow as ActivityLogRow }

export async function listActivityLogs(
  filters: ActivityFilters,
  roles: AppRole[] = [],
  limit = 100,
): Promise<AuditLogRow[]> {
  let rows = filterActivityRowsForRoles(await listAuditLogs(limit), roles)

  if (filters.entity_type) {
    rows = rows.filter((r) => r.entity_type === filters.entity_type)
  }

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
