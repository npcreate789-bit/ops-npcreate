import { hasNavFullAccess } from '../../shared/auth/access'
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
    roles: ['ceo', 'admin', 'dev'],
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
]

export const PHASE2_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase2)
export const PHASE3_NAV_ITEMS = NAV_ITEMS.filter((i) => i.phase3)

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
