import type { AppRole } from '../types/roles'

/** ตรงกับ `public.is_privileged()` ใน Supabase */
export const DB_PRIVILEGED_ROLES: AppRole[] = ['ceo', 'operations', 'dev']

/** เห็นเมนูครบทุกโมดูล (admin ดูแลการเงินแต่ต้องเข้าถึง cross-module ได้) */
export const NAV_FULL_ACCESS_ROLES: AppRole[] = ['ceo', 'operations', 'dev', 'admin']

export function hasDbPrivilegedRole(roles: AppRole[]): boolean {
  return roles.some((r) => DB_PRIVILEGED_ROLES.includes(r))
}

export function hasNavFullAccess(roles: AppRole[]): boolean {
  return roles.some((r) => NAV_FULL_ACCESS_ROLES.includes(r))
}

/** เปิดรายการแอด / ข้าม claim โดยไม่ต้องเป็นเจ้าของแคมเปญ */
export const ADS_BYPASS_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'dev',
  'admin',
  'senior_ads',
  'account',
]

export function hasAdsPrivilegedBypass(roles: AppRole[]): boolean {
  return roles.some((r) => ADS_BYPASS_ROLES.includes(r))
}

/** เห็นงานคอนเทนต์ทั้งทีม (มุมมองฟิลเตอร์ + RLS อ่านคิว) */
export const CONTENT_TEAM_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'dev',
  'account',
  'content',
]

/** อ่านคิวงานคอนเทนต์ทั้งทีม แต่ไม่สร้าง/แก้ไข (เช่น admin การเงิน) */
export const CONTENT_READ_ONLY_ROLES: AppRole[] = ['admin']

export function hasContentTeamView(roles: AppRole[]): boolean {
  return (
    roles.some((r) => CONTENT_TEAM_VIEW_ROLES.includes(r)) ||
    roles.some((r) => CONTENT_READ_ONLY_ROLES.includes(r))
  )
}

/** สร้าง/แก้ไขงานคอนเทนต์ — ตรง RLS insert/update */
export const CONTENT_MANAGE_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'dev',
  'content',
  'account',
]

export function canManageContentJobs(roles: AppRole[]): boolean {
  return roles.some((r) => CONTENT_MANAGE_ROLES.includes(r))
}

export function isContentReadOnly(roles: AppRole[]): boolean {
  return (
    hasContentTeamView(roles) &&
    !canManageContentJobs(roles) &&
    !hasDbPrivilegedRole(roles)
  )
}

export function canDeleteContentJob(
  roles: AppRole[],
  createdBy: string | undefined,
  userId: string,
): boolean {
  if (hasDbPrivilegedRole(roles)) return true
  return Boolean(createdBy && createdBy === userId)
}

/** ดูรายงานลูกค้าแบบ staff (เลือกลูกค้า preview) */
export const CLIENT_PORTAL_STAFF_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'dev',
  'admin',
  'account',
]

export function hasClientPortalStaffPreview(roles: AppRole[]): boolean {
  return roles.some((r) => CLIENT_PORTAL_STAFF_ROLES.includes(r))
}

// --- Phase 1: CRM (Leads) ---

/** เห็น Lead ทั้งทีม + สรุป Sales — ตรง leads_select (privileged + admin) */
export function hasCrmTeamView(roles: AppRole[]): boolean {
  return hasNavFullAccess(roles)
}

/** สร้าง Lead — ตรง leads_insert (privileged หรือ sales เป็นเจ้าของ) */
export function canCreateCrmLead(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.includes('sales')
}

export function canEditCrmLead(
  roles: AppRole[],
  ownerId: string | undefined,
  userId: string,
): boolean {
  if (hasDbPrivilegedRole(roles)) return true
  return roles.includes('sales') && Boolean(ownerId && ownerId === userId)
}

/** admin อ่าน leads ทั้งหมด แต่แก้ไม่ได้ (ยกเว้น lead ที่ตัวเองเป็น owner ซึ่งไม่เกิดบ่อย) */
export function isCrmReadOnly(roles: AppRole[]): boolean {
  return roles.includes('admin') && !hasDbPrivilegedRole(roles)
}

// --- Phase 1: Tasks ---

/** มุมมองงานทั้งทีม — ตรง tasks_select (privileged, admin, account, senior_ads) */
export const TASKS_TEAM_VIEW_ROLES: AppRole[] = ['admin', 'account', 'senior_ads']

export function hasTasksTeamView(roles: AppRole[]): boolean {
  return (
    hasDbPrivilegedRole(roles) ||
    roles.some((r) => TASKS_TEAM_VIEW_ROLES.includes(r))
  )
}

export function canEditTask(
  roles: AppRole[],
  task:
    | { assignee_id: string; created_by: string }
    | null
    | undefined,
  userId: string,
): boolean {
  if (hasDbPrivilegedRole(roles)) return true
  if (!task) return true
  return task.assignee_id === userId || task.created_by === userId
}

// --- Phase 1: Sales (Quotations) ---

export function canCreateSalesQuotation(roles: AppRole[]): boolean {
  return (
    hasDbPrivilegedRole(roles) ||
    roles.some((r) =>
      (['sales', 'ceo', 'admin'] as AppRole[]).includes(r),
    )
  )
}

export function canEditSalesQuotation(
  roles: AppRole[],
  ownerId: string | undefined,
  userId: string,
): boolean {
  if (hasDbPrivilegedRole(roles)) return true
  if (!ownerId) return canCreateSalesQuotation(roles)
  return (
    ownerId === userId &&
    roles.some((r) =>
      (['sales', 'ceo', 'admin'] as AppRole[]).includes(r),
    )
  )
}

// --- Phase 1: Finance ---

export const FINANCE_MANAGE_ROLES: AppRole[] = ['ceo', 'admin', 'dev']

export function canManageFinance(roles: AppRole[]): boolean {
  return roles.some((r) => FINANCE_MANAGE_ROLES.includes(r))
}
