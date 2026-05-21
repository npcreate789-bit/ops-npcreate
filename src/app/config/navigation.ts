import {
  ACTIVITY_LOG_VIEW_ROLES,
  CUSTOMER_360_VIEW_ROLES,
  FINANCE_VIEW_ROLES,
  GLOBAL_SEARCH_VIEW_ROLES,
  SYSTEM_STATUS_VIEW_ROLES,
  OPS_CENTER_VIEW_ROLES,
  TASKS_VIEW_ROLES,
  WORK_HUB_VIEW_ROLES,
  STAFF_ASSISTANT_ROLES,
  WEEKLY_REPORT_VIEW_ROLES,
} from '../../shared/auth/access'
import type { AppRole } from '../../shared/types/roles'
import { allowDevAuthBypass } from '../../shared/supabase/runtime'
import type { NavIconKey } from '../layout/NavIcons'

export type NavGroupId =
  | 'daily'
  | 'sales'
  | 'delivery'
  | 'retention'
  | 'analytics'
  | 'tools'
  | 'system'

export interface NavGroup {
  id: NavGroupId
  labelTh: string
  label: string
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { id: 'daily', labelTh: 'ทำงานวันนี้', label: 'Daily' },
  { id: 'sales', labelTh: 'ขาย → การเงิน', label: 'Sales → Finance' },
  { id: 'delivery', labelTh: 'ส่งมอบงาน', label: 'Delivery' },
  { id: 'retention', labelTh: 'ดูแลต่อเนื่อง', label: 'Retention' },
  { id: 'analytics', labelTh: 'รายงาน / วิเคราะห์', label: 'Analytics' },
  { id: 'tools', labelTh: 'เครื่องมือ / Admin', label: 'Tools' },
  { id: 'system', labelTh: 'ระบบ', label: 'System' },
] as const

export interface NavItem {
  path: string
  label: string
  labelTh: string
  /** Legacy unicode/emoji glyph (fallback ถ้าไม่ได้ตั้ง iconKey) */
  icon: string
  /** Modern SVG icon name — ดึงจาก `NavIcons` */
  iconKey?: NavIconKey
  /** หมวดเมนูใน sidebar (sidebar จะ insert header ระหว่างกลุ่ม) */
  group?: NavGroupId
  /** empty = all authenticated roles */
  roles: AppRole[]
  /** Sprint when module goes live */
  phase: number
  /** Phase 2 modules (Sprint 9+) */
  phase2?: boolean
  /** Phase 3 modules (Sprint 12+) */
  phase3?: boolean
  /** Phase 4 modules (Sprint 14+) */
  phase4?: boolean
  /** Phase 5 modules (Sprint 16+) — L9 AI */
  phase5?: boolean
  /** Phase 6 modules (Sprint 18+) — Ops & account */
  phase6?: boolean
  /** Phase 7 modules (Sprint 20+) — Activity & weekly */
  phase7?: boolean
  /** Phase 8 modules (Sprint 22+) — Customer 360 & export */
  phase8?: boolean
  /** Phase 9 modules (Sprint 24+) — Global search & deploy */
  phase9?: boolean
  /** Phase 10 modules (Sprint 25+) — Customer 360 timeline */
  phase10?: boolean
  /** Phase 11 modules (Sprint 26+) — Command palette & Ops center */
  phase11?: boolean
  /** Phase 13 modules (Sprint 29+) — Work hub inbox */
  phase13?: boolean
  /** Phase 14 modules (Sprint 30+) — Help & breadcrumbs */
  phase14?: boolean
  /** Phase 15 modules (Sprint 31+) — Keyboard reference & palette nav */
  phase15?: boolean
  /** Phase 16 modules (Sprint 32+) — Layout preferences & collapsible sidebar */
  phase16?: boolean
  /** Phase 17 modules (Sprint 33+) — Getting started checklist */
  phase17?: boolean
  /** Phase 18 modules (Sprint 34+) — About & build info */
  phase18?: boolean
  /** Phase 19 modules (Sprint 35+) — System status & health checks */
  phase19?: boolean
  ready: boolean
  /** false = ซ่อนจากแถบเมนู (รวมหน้าอื่นหรือ ⌘K แทน) */
  sidebar?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/app',
    label: 'Home',
    labelTh: 'หน้าหลัก',
    icon: '◈',
    iconKey: 'home',
    group: 'daily',
    roles: [],
    phase: 1,
    ready: true,
  },
  {
    path: '/app/start',
    label: 'Start',
    labelTh: 'เริ่มใช้งาน',
    icon: '✦',
    iconKey: 'sparkles',
    roles: [],
    phase: 33,
    phase17: true,
    ready: true,
    sidebar: false,
  },
  {
    path: '/app/crm',
    label: 'CRM / Leads',
    labelTh: 'ลูกค้าเป้าหมาย',
    icon: '◎',
    iconKey: 'target',
    group: 'sales',
    roles: ['ceo', 'operations', 'sales', 'admin', 'dev'],
    phase: 2,
    ready: true,
  },
  {
    path: '/app/sales',
    label: 'Sales & Quotation',
    labelTh: 'ขาย / ใบเสนอราคา',
    icon: '◆',
    iconKey: 'fileText',
    group: 'sales',
    roles: ['ceo', 'operations', 'sales', 'admin', 'dev'],
    phase: 3,
    ready: true,
  },
  {
    path: '/app/finance',
    label: 'Finance',
    labelTh: 'การเงิน',
    icon: '₿',
    iconKey: 'wallet',
    group: 'sales',
    roles: [...FINANCE_VIEW_ROLES, 'operations'],
    phase: 4,
    ready: true,
  },
  {
    path: '/app/onboarding',
    label: 'Brand Onboarding',
    labelTh: 'รับบรีฟลูกค้า',
    icon: '▣',
    iconKey: 'clipboardList',
    group: 'delivery',
    roles: ['ceo', 'operations', 'account', 'dev'],
    phase: 5,
    ready: true,
  },
  {
    path: '/app/projects',
    label: 'Projects',
    labelTh: 'โปรเจกต์',
    icon: '◫',
    iconKey: 'layers',
    group: 'delivery',
    roles: ['ceo', 'operations', 'account', 'sales', 'ads', 'senior_ads', 'content', 'dev'],
    phase: 5,
    ready: true,
  },
  {
    path: '/app/chat',
    label: 'Chat',
    labelTh: 'แชท',
    icon: '◇',
    iconKey: 'chat',
    group: 'daily',
    roles: ['ceo', 'operations', 'account', 'sales', 'ads', 'senior_ads', 'content', 'dev'],
    phase: 5,
    ready: true,
  },
  {
    path: '/app/ads',
    label: 'Ads Operations',
    labelTh: 'งานยิงแอด',
    icon: '▲',
    iconKey: 'megaphone',
    group: 'delivery',
    roles: ['ceo', 'operations', 'ads', 'senior_ads', 'account', 'dev'],
    phase: 6,
    ready: true,
  },
  {
    path: '/app/tasks',
    label: 'Tasks',
    labelTh: 'งานภายใน',
    icon: '☑',
    iconKey: 'checkSquare',
    group: 'daily',
    roles: [...TASKS_VIEW_ROLES],
    phase: 7,
    ready: true,
  },
  {
    path: '/app/dashboard',
    label: 'Executive Dashboard',
    labelTh: 'ภาพรวมผู้บริหาร',
    icon: '◉',
    iconKey: 'dashboard',
    group: 'analytics',
    roles: ['ceo', 'operations', 'dev', 'admin'],
    phase: 8,
    ready: true,
  },
  {
    path: '/app/admin',
    label: 'User Admin',
    labelTh: 'จัดการผู้ใช้',
    icon: '⚙',
    iconKey: 'shield',
    group: 'tools',
    roles: ['ceo', 'operations', 'dev'],
    phase: 9,
    phase2: true,
    ready: true,
  },
  {
    path: '/app/content',
    label: 'Content Ops',
    labelTh: 'งานคอนเทนต์',
    icon: '▤',
    iconKey: 'film',
    group: 'delivery',
    roles: ['ceo', 'operations', 'content', 'account', 'dev'],
    phase: 10,
    phase2: true,
    ready: true,
  },
  {
    path: '/app/client',
    label: 'Client Workspace',
    labelTh: 'พื้นที่ลูกค้า',
    icon: '▢',
    iconKey: 'briefcase',
    group: 'retention',
    roles: ['client', 'ceo', 'operations', 'dev', 'admin', 'account'],
    phase: 11,
    phase2: true,
    ready: true,
  },
  {
    path: '/app/notifications',
    label: 'Notifications',
    labelTh: 'แจ้งเตือน',
    icon: '◔',
    iconKey: 'bell',
    group: 'daily',
    roles: ['ceo', 'operations', 'sales', 'account', 'ads', 'senior_ads', 'content', 'admin', 'dev'],
    phase: 12,
    phase3: true,
    ready: true,
  },
  {
    path: '/app/creators',
    label: 'Creators',
    labelTh: 'ครีเอเตอร์',
    icon: '★',
    iconKey: 'star',
    group: 'delivery',
    roles: ['ceo', 'operations', 'content', 'account', 'dev'],
    phase: 13,
    phase3: true,
    ready: true,
  },
  {
    path: '/app/renewals',
    label: 'Renewals',
    labelTh: 'ต่อสัญญา',
    icon: '↻',
    iconKey: 'refresh',
    group: 'retention',
    roles: ['ceo', 'operations', 'account', 'sales', 'admin', 'dev'],
    phase: 14,
    phase4: true,
    ready: true,
  },
  {
    path: '/app/reports',
    label: 'Reports',
    labelTh: 'รายงานขั้นสูง',
    icon: '▦',
    iconKey: 'barChart',
    group: 'analytics',
    roles: ['ceo', 'operations', 'account', 'admin', 'dev'],
    phase: 15,
    phase4: true,
    ready: true,
  },
  {
    path: '/app/assistant',
    label: 'AI Assistant',
    labelTh: 'ผู้ช่วย AI',
    icon: '✦',
    iconKey: 'sparkles',
    group: 'tools',
    roles: [...STAFF_ASSISTANT_ROLES],
    phase: 16,
    phase5: true,
    ready: true,
  },
  // หมายเหตุ: route /app/timeline ปัจจุบัน redirect ไป /app/work — ไม่ลงทะเบียนใน NAV เพื่อกันสับสน
  // (อ้างอิงต่อใน customerLinks เก่าได้ผ่าน path constant)
  {
    path: '/app/settings',
    label: 'Settings',
    labelTh: 'ตั้งค่า',
    icon: '⚙',
    iconKey: 'settings',
    group: 'system',
    roles: [],
    phase: 19,
    phase6: true,
    ready: true,
  },
  {
    path: '/app/activity',
    label: 'Activity',
    labelTh: 'บันทึกกิจกรรม',
    icon: '◷',
    iconKey: 'activity',
    group: 'analytics',
    roles: [...ACTIVITY_LOG_VIEW_ROLES, 'dev'],
    phase: 20,
    phase7: true,
    ready: true,
  },
  {
    path: '/app/weekly',
    label: 'Weekly',
    labelTh: 'สรุปรายสัปดาห์',
    icon: '▥',
    iconKey: 'calendar',
    group: 'analytics',
    roles: [...WEEKLY_REPORT_VIEW_ROLES],
    phase: 21,
    phase7: true,
    ready: true,
  },
  {
    path: '/app/customers',
    label: 'Customers 360',
    labelTh: 'ลูกค้า 360',
    icon: '◎',
    iconKey: 'users',
    group: 'delivery',
    roles: [...CUSTOMER_360_VIEW_ROLES],
    phase: 22,
    phase8: true,
    phase10: true,
    ready: true,
  },
  {
    path: '/app/search',
    label: 'Search',
    labelTh: 'ค้นหา',
    icon: '⌕',
    iconKey: 'search',
    roles: [...GLOBAL_SEARCH_VIEW_ROLES],
    phase: 23,
    phase9: true,
    ready: true,
    sidebar: false,
  },
  {
    path: '/app/ops',
    label: 'Ops Center',
    labelTh: 'ศูนย์ Ops',
    icon: '⚙',
    iconKey: 'cpu',
    group: 'tools',
    roles: [...OPS_CENTER_VIEW_ROLES],
    phase: 26,
    phase11: true,
    ready: true,
  },
  {
    path: '/app/work',
    label: 'Work Hub',
    labelTh: 'งานของฉัน',
    icon: '◫',
    iconKey: 'inbox',
    group: 'daily',
    roles: [...WORK_HUB_VIEW_ROLES],
    phase: 27,
    phase13: true,
    ready: true,
  },
  {
    path: '/app/help',
    label: 'Help',
    labelTh: 'ช่วยเหลือ',
    icon: '?',
    iconKey: 'help',
    group: 'system',
    roles: [],
    phase: 28,
    phase14: true,
    ready: true,
  },
  {
    path: '/app/keyboard',
    label: 'Keyboard',
    labelTh: 'คีย์ลัด',
    icon: '⌨',
    iconKey: 'sparkles',
    roles: [],
    phase: 31,
    phase15: true,
    ready: true,
    sidebar: false,
  },
  {
    path: '/app/layout',
    label: 'Layout',
    labelTh: 'การจัดวาง',
    icon: '◧',
    iconKey: 'dashboard',
    roles: [],
    phase: 32,
    phase16: true,
    ready: true,
    sidebar: false,
  },
  {
    path: '/app/about',
    label: 'About',
    labelTh: 'เกี่ยวกับ',
    icon: 'ℹ',
    iconKey: 'help',
    roles: [],
    phase: 34,
    phase18: true,
    ready: true,
    sidebar: false,
  },
  {
    path: '/app/status',
    label: 'Status',
    labelTh: 'สถานะ',
    icon: '●',
    iconKey: 'signal',
    group: 'system',
    roles: [...SYSTEM_STATUS_VIEW_ROLES],
    phase: 35,
    phase19: true,
    ready: true,
  },
]

export const PHASE2_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase2)
export const PHASE3_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase3)
export const PHASE4_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase4)
export const PHASE5_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase5)
export const PHASE6_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase6)
export const PHASE7_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase7)
export const PHASE8_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase8)
export const PHASE9_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase9)
export const PHASE10_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase10)
export const PHASE11_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase11)
export const PHASE13_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase13)
export const PHASE14_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase14)
export const PHASE15_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase15)
export const PHASE16_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase16)
export const PHASE17_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase17)
export const PHASE18_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase18)
export const PHASE19_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase19)

/**
 * ลำดับแสดงในแถบเมนู (เฉพาะรายการที่ sidebar !== false)
 * 7 กลุ่มตาม flow งานจริงของทีม:
 *   Daily → Sales/Finance → Delivery → Retention → Analytics → Tools/Admin → Settings
 */
export const NAV_DISPLAY_ORDER: readonly string[] = [
  // 1) Daily — งานประจำวันทุก role
  '/app',
  '/app/work',
  '/app/chat',
  '/app/notifications',
  '/app/tasks',

  // 2) Sales → Finance — flow ปิดดีลและรับเงิน
  '/app/crm',
  '/app/sales',
  '/app/finance',

  // 3) Delivery — หลังปิดดีล (Onboarding → Production)
  '/app/onboarding',
  '/app/projects',
  '/app/ads',
  '/app/content',
  '/app/creators',
  '/app/customers',

  // 4) Retention — ลูกค้าเดิม
  '/app/renewals',
  '/app/client',

  // 5) Analytics — รายงาน/สรุป
  '/app/dashboard',
  '/app/weekly',
  '/app/reports',
  '/app/activity',

  // 6) Tools / Admin
  '/app/assistant',
  '/app/admin',
  '/app/ops',

  // 7) Settings
  '/app/settings',
  '/app/help',
  '/app/status',
] as const

const NAV_ORDER_INDEX = new Map<string, number>(
  NAV_DISPLAY_ORDER.map((path, index) => [path, index]),
)

function compareNavDisplayOrder(a: NavItem, b: NavItem): number {
  const ai = NAV_ORDER_INDEX.get(a.path) ?? 999
  const bi = NAV_ORDER_INDEX.get(b.path) ?? 999
  if (ai !== bi) return ai - bi
  return a.labelTh.localeCompare(b.labelTh, 'th')
}

/** โหมด dev — จำลอง ceo เมื่อยังไม่มีบทบาทจาก backend */
export function effectiveRolesForNav(roles: AppRole[], configured: boolean): AppRole[] {
  if (roles.length > 0) return roles
  if (!configured && allowDevAuthBypass) return ['ceo']
  return []
}

/**
 * เมนูแสดงตามสิทธิ์ตรง ๆ จาก `item.roles`:
 *   - `path === '/app'` → ใครก็เข้าถึงหน้า Home ได้
 *   - `roles.length === 0` → เปิดทุก role ที่ login ได้ (Settings / Help / Start ฯลฯ)
 *   - ตรง role ใดใน `item.roles` → เห็น
 *   - ไม่ตรง → ไม่เห็น (ไม่มี cross-module fallback)
 *
 * ถ้าต้องการให้ Admin / Operations / Dev เห็นเมนูใหม่ ให้เพิ่ม role
 * ลง `item.roles` โดยตรงเพื่อความชัดเจน — ห้ามพึ่ง `hasNavFullAccess`
 */
export function canAccessNavItem(roles: AppRole[], item: NavItem): boolean {
  if (item.path === '/app') return true
  if (item.roles.length === 0) return true
  return item.roles.some((r) => roles.includes(r))
}

export function navItemsForRoles(roles: AppRole[]): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccessNavItem(roles, item)).sort(compareNavDisplayOrder)
}

/** เมนูในแถบข้าง — ไม่รวมโมดูลที่ยุบเข้าหน้าอื่น */
export function sidebarNavItemsForRoles(roles: AppRole[]): NavItem[] {
  return navItemsForRoles(roles).filter((item) => item.sidebar !== false)
}

export interface NavGroupSection {
  group: NavGroup
  items: NavItem[]
}

/**
 * เมนู sidebar จัดเป็นกลุ่มตาม `NAV_GROUPS` — กลุ่มไหนไม่มี item ที่ role เข้าถึงได้
 * จะไม่ออกมาในผลลัพธ์ ส่วน item ที่ไม่ระบุ `group` จะถูกจัดไป group "system" เพื่อไม่หาย
 */
export function groupedSidebarNavItemsForRoles(roles: AppRole[]): NavGroupSection[] {
  const items = sidebarNavItemsForRoles(roles)
  const buckets = new Map<NavGroupId, NavItem[]>()
  for (const item of items) {
    const groupId = (item.group ?? 'system') as NavGroupId
    const existing = buckets.get(groupId)
    if (existing) existing.push(item)
    else buckets.set(groupId, [item])
  }
  return NAV_GROUPS
    .map((group) => ({ group, items: buckets.get(group.id) ?? [] }))
    .filter((section) => section.items.length > 0)
}

/** ตรวจว่า role ปัจจุบันเข้า path โมดูลได้ (รวม sub-routes) */
export function canAccessNavPath(roles: AppRole[], pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  if (normalized === '/app') return true

  const items = navItemsForRoles(roles)
  return items.some(
    (item) =>
      item.path !== '/app' &&
      (normalized === item.path || normalized.startsWith(`${item.path}/`)),
  )
}
