import { APP_ROLES, type AppRole } from '../../../shared/types/roles'
import type { AdminUserRow } from './types'

export type AdminAudienceFilter = 'staff' | 'client' | 'mixed' | 'all'

export type AdminUserKind = 'staff' | 'client' | 'mixed' | 'none'

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
  return 'none'
}

export function adminUserKindLabel(kind: AdminUserKind): string {
  switch (kind) {
    case 'client':
      return 'ลูกค้า (พอร์ทัล)'
    case 'staff':
      return 'พนักงาน'
    case 'mixed':
      return 'ผสมบทบาท'
    case 'none':
      return 'ยังไม่มีบทบาท'
  }
}

/** ห้ามรวม client กับบทบาทพนักงานในบัญชีเดียว */
export function assertValidRoleMix(roles: AppRole[]): void {
  const hasClient = roles.includes('client')
  const staffRoles = roles.filter((r) => r !== 'client')
  if (hasClient && staffRoles.length > 0) {
    throw new Error(
      'อย่ารวมบทบาทลูกค้าพอร์ทัลกับบทบาทพนักงานในบัญชีเดียว — สร้างคนละบัญชี',
    )
  }
}

export function matchesAdminAudience(
  row: AdminUserRow,
  filter: AdminAudienceFilter,
): boolean {
  if (filter === 'all') return true
  return adminUserKind(row) === filter
}

export function countAdminAudience(
  rows: AdminUserRow[],
): Partial<Record<AdminAudienceFilter, number>> {
  let staff = 0
  let client = 0
  let mixed = 0
  for (const row of rows) {
    const kind = adminUserKind(row)
    if (kind === 'staff' || kind === 'none') staff += 1
    else if (kind === 'client') client += 1
    else if (kind === 'mixed') mixed += 1
  }
  return {
    all: rows.length,
    staff,
    client,
    mixed,
  }
}
