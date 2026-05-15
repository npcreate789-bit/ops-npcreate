import {
  ACTIVITY_LOG_VIEW_ROLES,
  CUSTOMER_360_VIEW_ROLES,
  FINANCE_VIEW_ROLES,
  GLOBAL_SEARCH_VIEW_ROLES,
  hasNavFullAccess,
  STAFF_ASSISTANT_ROLES,
  TIMELINE_VIEW_ROLES,
  WEEKLY_REPORT_VIEW_ROLES,
} from '../../shared/auth/access'
import type { AppRole } from '../../shared/types/roles'

export interface NavItem {
  path: string
  label: string
  labelTh: string
  icon: string
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
  ready: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    path: '/app',
    label: 'Home',
    labelTh: 'หน้าหลัก',
    icon: '◈',
    roles: [],
    phase: 1,
    ready: true,
  },
  {
    path: '/app/crm',
    label: 'CRM / Leads',
    labelTh: 'ลูกค้าเป้าหมาย',
    icon: '◎',
    roles: ['ceo', 'operations', 'sales', 'dev'],
    phase: 2,
    ready: true,
  },
  {
    path: '/app/sales',
    label: 'Sales & Quotation',
    labelTh: 'ขาย / ใบเสนอราคา',
    icon: '◆',
    roles: ['ceo', 'operations', 'sales', 'admin', 'dev'],
    phase: 3,
    ready: true,
  },
  {
    path: '/app/finance',
    label: 'Finance',
    labelTh: 'การเงิน',
    icon: '₿',
    roles: [...FINANCE_VIEW_ROLES],
    phase: 4,
    ready: true,
  },
  {
    path: '/app/onboarding',
    label: 'Brand Onboarding',
    labelTh: 'รับบรีฟลูกค้า',
    icon: '▣',
    roles: ['ceo', 'operations', 'account', 'dev'],
    phase: 5,
    ready: true,
  },
  {
    path: '/app/ads',
    label: 'Ads Operations',
    labelTh: 'งานยิงแอด',
    icon: '▲',
    roles: ['ceo', 'operations', 'ads', 'senior_ads', 'account', 'dev'],
    phase: 6,
    ready: true,
  },
  {
    path: '/app/tasks',
    label: 'Tasks',
    labelTh: 'งานภายใน',
    icon: '☑',
    roles: [],
    phase: 7,
    ready: true,
  },
  {
    path: '/app/dashboard',
    label: 'Executive Dashboard',
    labelTh: 'ภาพรวมผู้บริหาร',
    icon: '◉',
    roles: ['ceo', 'operations', 'dev', 'admin'],
    phase: 8,
    ready: true,
  },
  {
    path: '/app/admin',
    label: 'User Admin',
    labelTh: 'จัดการผู้ใช้',
    icon: '⚙',
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
    roles: ['ceo', 'operations', 'content', 'account', 'dev'],
    phase: 10,
    phase2: true,
    ready: true,
  },
  {
    path: '/app/client',
    label: 'Client Portal',
    labelTh: 'รายงานลูกค้า',
    icon: '◇',
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
    roles: [...STAFF_ASSISTANT_ROLES],
    phase: 16,
    phase5: true,
    ready: true,
  },
  {
    path: '/app/timeline',
    label: 'Timeline',
    labelTh: 'ไทม์ไลน์งาน',
    icon: '⏱',
    roles: [...TIMELINE_VIEW_ROLES],
    phase: 18,
    phase6: true,
    ready: true,
  },
  {
    path: '/app/settings',
    label: 'Settings',
    labelTh: 'ตั้งค่า',
    icon: '⚙',
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
    roles: [...ACTIVITY_LOG_VIEW_ROLES, 'ceo', 'dev'],
    phase: 20,
    phase7: true,
    ready: true,
  },
  {
    path: '/app/weekly',
    label: 'Weekly',
    labelTh: 'สรุปรายสัปดาห์',
    icon: '▥',
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
    roles: [...CUSTOMER_360_VIEW_ROLES],
    phase: 22,
    phase8: true,
    ready: true,
  },
  {
    path: '/app/search',
    label: 'Search',
    labelTh: 'ค้นหา',
    icon: '⌕',
    roles: [...GLOBAL_SEARCH_VIEW_ROLES],
    phase: 23,
    phase9: true,
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

export function navItemsForRoles(roles: AppRole[]): NavItem[] {
  if (hasNavFullAccess(roles)) return NAV_ITEMS

  return NAV_ITEMS.filter(
    (item) =>
      item.roles.length === 0 ||
      item.roles.some((r) => roles.includes(r)),
  )
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
