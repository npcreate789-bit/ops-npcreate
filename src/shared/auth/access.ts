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

/** งานภายใน — ทีมภายในเท่านั้น (ไม่รวม client) */
export const TASKS_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'sales',
  'account',
  'ads',
  'senior_ads',
  'content',
  'admin',
  'dev',
]

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

/** แก้ไขงานคอนเทนต์ — ตรง content_jobs_update (00029) */
export function canEditContentJob(
  roles: AppRole[],
  job:
    | { assignee_id: string; created_by: string }
    | null
    | undefined,
  userId: string,
): boolean {
  if (isContentReadOnly(roles)) return false
  if (hasDbPrivilegedRole(roles)) return true
  if (!job) return canManageContentJobs(roles)
  if (roles.includes('content') || roles.includes('account')) return true
  return job.assignee_id === userId || job.created_by === userId
}

// --- Chat hub ---

/** กล่องแชทรวม — ทีมที่เข้าถึงโปรเจกต์ได้ */
export const CHAT_HUB_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'account',
  'sales',
  'ads',
  'senior_ads',
  'content',
  'dev',
]

export function canViewChatHub(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  if (roles.every((r) => r === 'client')) return false
  return hasNavFullAccess(roles) || roles.some((r) => CHAT_HUB_VIEW_ROLES.includes(r))
}

// --- Phase 2: Admin ---

export function canManageAdminUsers(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles)
}

export function canViewAdminAudit(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles)
}

// --- Phase 3: Notifications ---

/** ทีมภายใน (ไม่รวม client เท่านั้น) */
export function canAccessNotifications(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  if (roles.length === 1 && roles[0] === 'client') return false
  return roles.some((r) => r !== 'client')
}

// --- Phase 3: Creators ---

export const CREATORS_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'content',
  'account',
]

/** สร้าง/แก้ไข — ตรง creators_insert/update (00031 + 00032) */
export const CREATORS_MANAGE_ROLES: AppRole[] = ['operations', 'content', 'account']

export function canViewCreators(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.some((r) => CREATORS_VIEW_ROLES.includes(r))
}

export function canManageCreators(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.some((r) => CREATORS_MANAGE_ROLES.includes(r))
}

/** ดูรายการได้แต่ RLS ไม่ให้แก้ (ยังไม่มี role แบบนี้ — เก็บ pattern เดียวกับ content) */
export function isCreatorsReadOnly(roles: AppRole[]): boolean {
  return canViewCreators(roles) && !canManageCreators(roles)
}

// --- Phase 4: Contract renewals ---

export const RENEWALS_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'account',
  'sales',
  'admin',
]

/** จัดการต่อสัญญา — ตรง contract_renewals_insert/update + extend_customer_contract */
export const RENEWALS_MANAGE_ROLES: AppRole[] = ['operations', 'account']

export function canViewRenewals(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.some((r) => RENEWALS_VIEW_ROLES.includes(r))
}

export function canManageRenewals(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.some((r) => RENEWALS_MANAGE_ROLES.includes(r))
}

export function isRenewalsReadOnly(roles: AppRole[]): boolean {
  return canViewRenewals(roles) && !canManageRenewals(roles)
}

// --- Phase 4: Reports & insights ---

export const REPORTS_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'account',
  'admin',
]

export function canViewReports(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.some((r) => REPORTS_VIEW_ROLES.includes(r))
}

/** แสดงตัวเลขการเงินในรายงาน — ตรง payments_select */
export function canViewReportFinanceMetrics(roles: AppRole[]): boolean {
  return (
    hasDbPrivilegedRole(roles) ||
    roles.some((r) => (['admin', 'sales', 'account'] as AppRole[]).includes(r))
  )
}

// --- Phase 5: AI Assistant (L9) ---

/** สอดคล้องเมนู `/app/assistant` */
export const STAFF_ASSISTANT_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'sales',
  'account',
  'ads',
  'senior_ads',
  'content',
  'admin',
  'dev',
]

/** ผู้ช่วยทีมภายใน — ตรง NAV_ITEMS; บัญชี client เท่านั้นใช้ไม่ได้ */
export function canAccessStaffAssistant(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  if (roles.every((r) => r === 'client')) return false
  return hasNavFullAccess(roles) || roles.some((r) => STAFF_ASSISTANT_ROLES.includes(r))
}

/** Q&A ใน Client Portal — ลูกค้าจริง หรือทีมที่มีสิทธิ์ดูรายงานลูกค้า */
export function canUseClientPortalAi(roles: AppRole[]): boolean {
  if (roles.includes('client')) return true
  return hasClientPortalStaffPreview(roles)
}

/** ทีม preview รายงานลูกค้า — แสดงแบนเนอร์ขอบเขต */
export function isClientPortalAiStaffPreview(roles: AppRole[]): boolean {
  return !roles.includes('client') && hasClientPortalStaffPreview(roles)
}

// --- Phase 6: Operations timeline & profile ---

/** ไทม์ไลน์งานค้าง — Operations / Account / Sales */
export const TIMELINE_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'account',
  'sales',
  'admin',
  'dev',
]

export function canViewTimeline(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  if (roles.every((r) => r === 'client')) return false
  return hasNavFullAccess(roles) || roles.some((r) => TIMELINE_VIEW_ROLES.includes(r))
}

/** อ่านการเงิน — ตรง payments_select */
export const FINANCE_VIEW_ROLES: AppRole[] = ['ceo', 'admin', 'dev', 'sales', 'account']

export function canViewFinance(roles: AppRole[]): boolean {
  return (
    hasDbPrivilegedRole(roles) ||
    roles.some((r) => FINANCE_VIEW_ROLES.includes(r))
  )
}

/** ดูใบเสร็จ/ใบกำกับที่ออกแล้ว — ตรง payments_select */
export function canViewFinanceDocuments(roles: AppRole[]): boolean {
  return canViewFinance(roles)
}

/** บันทึก/แก้ไขการเงิน — ตรง payments_insert/update */
export function isFinanceReadOnly(roles: AppRole[]): boolean {
  return canViewFinance(roles) && !canManageFinance(roles)
}

/** ตั้งค่าโปรไฟล์ — ทุกบทบาทที่ login ได้ */
export function canAccessSettings(_roles: AppRole[]): boolean {
  return true
}

// --- Phase 7: Activity log & weekly summary ---

/** อ่าน audit log — privileged หรือ operations/account/admin (ตรง 00036) */
export const ACTIVITY_LOG_VIEW_ROLES: AppRole[] = ['ceo', 'operations', 'account', 'admin']

export function canViewActivityLog(roles: AppRole[]): boolean {
  return (
    canViewAdminAudit(roles) ||
    roles.some((r) => ACTIVITY_LOG_VIEW_ROLES.includes(r))
  )
}

/** สรุปรายสัปดาห์ — ทีมบริหารและ Account */
export const WEEKLY_REPORT_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'account',
  'admin',
  'dev',
]

export function canViewWeeklyReport(roles: AppRole[]): boolean {
  return hasDbPrivilegedRole(roles) || roles.some((r) => WEEKLY_REPORT_VIEW_ROLES.includes(r))
}

// --- Phase 8: Customer 360 & exports ---

/** ศูนย์กลางลูกค้า — ตาม customers_select + RLS แอด/คอนเทนต์ */
export const CUSTOMER_360_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'sales',
  'account',
  'admin',
  'dev',
  'ads',
  'senior_ads',
  'content',
]

export function canViewCustomer360(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return (
    hasNavFullAccess(roles) ||
    hasDbPrivilegedRole(roles) ||
    roles.some((r) => CUSTOMER_360_VIEW_ROLES.includes(r))
  )
}

// --- Phase 9: Global search ---

/** เมนูค้นหารวม — ทุกบทบาทภายในยกเว้น client อย่างเดียว */
export const GLOBAL_SEARCH_VIEW_ROLES: AppRole[] = [
  'ceo',
  'operations',
  'sales',
  'account',
  'ads',
  'senior_ads',
  'content',
  'admin',
  'dev',
]

// --- Phase 11: Ops center ---

/** ศูนย์ Ops / deploy — CEO, Operations, Dev */
export const OPS_CENTER_VIEW_ROLES: AppRole[] = [...DB_PRIVILEGED_ROLES]

export function canViewOpsCenter(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return roles.some((r) => OPS_CENTER_VIEW_ROLES.includes(r))
}

/** ค้นหารวม — สอดคล้องเมนู: บทบาทภายใน ไม่รวม client อย่างเดียว */
export function canUseGlobalSearch(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  if (roles.every((r) => r === 'client')) return false
  return roles.some((r) => GLOBAL_SEARCH_VIEW_ROLES.includes(r))
}

// --- Phase 12: Quick access ---

/** หน้าล่าสุดและปักหมุด — สอดคล้องค้นหาด่วน (ทีมภายใน) */
export function canUseQuickAccess(roles: AppRole[]): boolean {
  return canUseGlobalSearch(roles)
}

// --- Phase 13: Work hub ---

/** ศูนย์งานของฉัน — ทีมภายใน (สอดคล้องค้นหารวม) */
export const WORK_HUB_VIEW_ROLES: AppRole[] = [...GLOBAL_SEARCH_VIEW_ROLES]

export function canViewWorkHub(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  if (roles.every((r) => r === 'client')) return false
  return roles.some((r) => WORK_HUB_VIEW_ROLES.includes(r))
}

// --- Phase 14: Help center ---

/** ศูนย์ช่วยเหลือ — ผู้ใช้ที่ login ได้ทุกบทบาท */
export function canViewHelp(_roles: AppRole[]): boolean {
  return true
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
