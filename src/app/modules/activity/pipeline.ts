import { AUDIT_ACTION_GROUPS } from '../../../shared/audit/actionLabels'
import type { AuditLogRow } from '../admin/api/auditLogs'

export type ActivityCategoryFilter = string

export const ACTIVITY_CATEGORY_ALL = ''

export function matchesActivityCategory(
  row: AuditLogRow,
  category: ActivityCategoryFilter,
): boolean {
  if (!category) return true
  const prefix = category
  return row.action.startsWith(`${prefix}.`) || row.action === prefix
}

export function countActivityByCategory(
  rows: AuditLogRow[],
): Partial<Record<ActivityCategoryFilter, number>> {
  const counts: Partial<Record<ActivityCategoryFilter, number>> = {
    [ACTIVITY_CATEGORY_ALL]: rows.length,
  }
  for (const g of AUDIT_ACTION_GROUPS) {
    if (!g.value) continue
    counts[g.value] = rows.filter((r) => matchesActivityCategory(r, g.value)).length
  }
  return counts
}
