import { APP_ROLES, type AppRole } from '../../../shared/types/roles'
import type { AdminUserRow } from './types'

export type AdminAudienceFilter = 'all' | 'staff' | 'client'

export type AdminUserKind = 'staff' | 'client' | 'mixed'

/** บทบาทที่แก้ได้ในตารางพนักงาน — ไม่รวม client */
export const STAFF_MANAGEABLE_ROLES = APP_ROLES.filter(
  (r): r is AppRole => r !== 'dev' && r !== 'client',
)

export function adminUserKind(row: AdminUserRow): AdminUserKind {
  const hasClient = row.roles.includes('client')
  const staffRoles = row.roles.filter((r) => r !== 'client')
  if (hasClient && staffRoles.length === 0) return 'client'
  if (!hasClient && staffRoles.length > 0) return 'staff'
  if (hasClient && staffRoles.length > 0) return 'mixed'
  return 'staff'
}

export function adminUserKindLabel(kind: AdminUserKind): string {
  switch (kind) {
    case 'client':
      return 'ลูกค้า (พอร์ทัล)'
    case 'staff':
      return 'พนักงาน'
    case 'mixed':
      return 'ผสมบทบาท'
  }
}

export function matchesAdminAudience(
  row: AdminUserRow,
  filter: AdminAudienceFilter,
): boolean {
  if (filter === 'all') return true
  const kind = adminUserKind(row)
  if (filter === 'staff') return kind === 'staff' || kind === 'mixed'
  return kind === 'client' || kind === 'mixed'
}

export function countAdminAudience(
  rows: AdminUserRow[],
): Partial<Record<AdminAudienceFilter, number>> {
  let staff = 0
  let client = 0
  let mixed = 0
  for (const row of rows) {
    const kind = adminUserKind(row)
    if (kind === 'staff') staff += 1
    else if (kind === 'client') client += 1
    else mixed += 1
  }
  return {
    all: rows.length,
    staff: staff + mixed,
    client: client + mixed,
  }
}
