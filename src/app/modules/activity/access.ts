import { canViewAdminAudit } from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import type { AuditLogRow } from '../admin/api/auditLogs'

/** การกระทำที่เกี่ยวกับผู้ใช้/สิทธิ์/พอร์ทัล — เฉพาะผู้ดูแลระบบ */
const SENSITIVE_ACTION_PREFIXES = ['user.', 'client_access.']

export function canViewSensitiveAudit(roles: AppRole[]): boolean {
  return canViewAdminAudit(roles)
}

export function filterActivityRowsForRoles(
  rows: AuditLogRow[],
  roles: AppRole[],
): AuditLogRow[] {
  if (canViewSensitiveAudit(roles)) return rows
  return rows.filter(
    (r) => !SENSITIVE_ACTION_PREFIXES.some((p) => r.action.startsWith(p)),
  )
}
