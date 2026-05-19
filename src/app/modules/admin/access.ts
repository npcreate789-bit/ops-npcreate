import { hasDbPrivilegedRole } from '../../../shared/auth/access'
import { APP_ROLES, type AppRole } from '../../../shared/types/roles'

/** สร้างบัญชีพนักงาน — CEO และผู้จัดการ (Operations) + Dev */
export function canCreateEmployeeUser(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles)
}

/** แก้ไขชื่อ/รหัสผู้ใช้พนักงาน */
export function canEditEmployeeUser(
  actorRoles: AppRole[],
  targetUserRoles: AppRole[],
  isSelf: boolean,
): boolean {
  if (!canCreateEmployeeUser(actorRoles)) return false
  if (isSelf) return true
  return canEditCeoUserRoles(actorRoles, targetUserRoles)
}

/** ลบบัญชีพนักงาน (ไม่รวม client-only) */
export function canDeleteEmployeeUser(
  actorRoles: AppRole[],
  targetUserRoles: AppRole[],
  isSelf: boolean,
): boolean {
  if (isSelf) return false
  if (!canCreateEmployeeUser(actorRoles)) return false
  if (targetUserRoles.includes('dev') && !actorRoles.includes('dev')) return false
  return canEditCeoUserRoles(actorRoles, targetUserRoles)
}

/** ดูรหัสผ่านชั่วคราวของพนักงาน — เฉพาะ CEO */
export function canViewStaffPasswords(roles: AppRole[]): boolean {
  return roles.includes('ceo')
}

const PRIVILEGED_ONLY_ROLES: AppRole[] = ['ceo', 'operations']

/** มอบ/ถอนบทบาท CEO — เฉพาะ CEO */
export function canAssignCeoRole(actorRoles: AppRole[]): boolean {
  return actorRoles.includes('ceo')
}

/** จัดการผู้ใช้ที่มีบทบาท CEO (บทบาท / เปิด-ปิดบัญชี) — เฉพาะ CEO */
export function canEditCeoUserRoles(actorRoles: AppRole[], targetUserRoles: AppRole[]): boolean {
  if (!targetUserRoles.includes('ceo')) return true
  return actorRoles.includes('ceo')
}

/** เปิด/ปิดบัญชีผู้ใช้ CEO */
export function canManageCeoUserStatus(
  actorRoles: AppRole[],
  targetUserRoles: AppRole[],
): boolean {
  return canEditCeoUserRoles(actorRoles, targetUserRoles)
}

/** เปลี่ยนบทบาทใดๆ ของผู้ใช้เป้าหมาย */
export function canModifyUserRole(
  actorRoles: AppRole[],
  targetUserRoles: AppRole[],
  role: AppRole,
): boolean {
  if (role === 'ceo') return canAssignCeoRole(actorRoles)
  return canEditCeoUserRoles(actorRoles, targetUserRoles)
}

/** บทบาทที่ผู้สร้างมอบให้พนักงานใหม่ได้ */
export function assignableRolesForCreator(creatorRoles: AppRole[]): AppRole[] {
  const manageable = APP_ROLES.filter((r) => r !== 'dev')
  if (creatorRoles.includes('ceo') || creatorRoles.includes('dev')) {
    return manageable
  }
  if (creatorRoles.includes('operations')) {
    return manageable.filter((r) => !PRIVILEGED_ONLY_ROLES.includes(r))
  }
  return []
}

/** บทบาทพนักงานเท่านั้น — ไม่รวม client (ใช้วิซาร์ดสร้างบัญชีลูกค้าแยก) */
export function assignableStaffRolesForCreator(creatorRoles: AppRole[]): AppRole[] {
  return assignableRolesForCreator(creatorRoles).filter((r) => r !== 'client')
}
