export { canViewOpsCenter, OPS_CENTER_VIEW_ROLES } from '../../../shared/auth/access'

import {
  canAccessNavPath,
  effectiveRolesForNav,
} from '../../config/navigation'
import {
  canUseGlobalSearch,
  canViewActivityLog,
  canViewSystemStatus,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'

export interface OpsRelatedLink {
  path: string
  label: string
  hint: string
}

export type OpsChecklistKey = 'env' | 'migrate' | 'build' | 'deploy'

export function canShowOpsQuickSearch(roles: AppRole[]): boolean {
  return canUseGlobalSearch(roles)
}

export function canShowOpsNavLink(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return true
  return canAccessNavPath(roles, path)
}

export function canShowOpsActivityLink(roles: AppRole[]): boolean {
  if (roles.length === 0) return true
  return canViewActivityLog(roles)
}

export function opsChecklistStatus(
  key: OpsChecklistKey,
  configured: boolean,
): 'ok' | 'warn' | 'manual' {
  if (key === 'env') {
    return configured ? 'ok' : 'warn'
  }
  return 'manual'
}

function opsDevMode(roles: AppRole[], configured: boolean): boolean {
  return !configured && effectiveRolesForNav(roles, configured).length > 0
}

/** ลิงก์ไปโมดูลที่เกี่ยวกับการดำเนินงานและ deploy */
export function opsRelatedLinksForRoles(
  roles: AppRole[],
  configured: boolean,
): OpsRelatedLink[] {
  const effective = effectiveRolesForNav(roles, configured)
  const devMode = opsDevMode(roles, configured)
  const candidates: OpsRelatedLink[] = [
    {
      path: '/app/status',
      label: 'สถานะระบบ',
      hint: 'ตรวจ Supabase · ฐานข้อมูล · โดเมน',
    },
    {
      path: '/app/work',
      label: 'งานของฉัน',
      hint: 'งานค้างและแจ้งเตือน',
    },
    {
      path: '/app/customers',
      label: 'ลูกค้า 360°',
      hint: 'ภาพรวมลูกค้าและสัญญา',
    },
    {
      path: '/app/tasks',
      label: 'งานภายใน',
      hint: 'มอบหมายและติดตามงานทีม',
    },
    {
      path: '/app/onboarding',
      label: 'รับบรีฟลูกค้า',
      hint: 'ตรวจบรีฟหลังลูกค้าส่ง',
    },
    {
      path: '/app/finance',
      label: 'การเงิน',
      hint: 'ชำระเงินและใบแจ้งหนี้',
    },
    {
      path: '/app/projects',
      label: 'โปรเจกต์',
      hint: 'ติดตามงานตามบริการ',
    },
    {
      path: '/app/client',
      label: 'พื้นที่ลูกค้า',
      hint: 'ตัวอย่างหน้าที่ลูกค้าเห็น',
    },
    {
      path: '/app/activity',
      label: 'บันทึกกิจกรรม',
      hint: 'ประวัติการเปลี่ยนแปลงในระบบ',
    },
    {
      path: '/app/help',
      label: 'ช่วยเหลือ',
      hint: 'คู่มือและคีย์ลัด',
    },
    {
      path: '/app/about',
      label: 'เกี่ยวกับ',
      hint: 'เวอร์ชันแอปและ build',
    },
  ]

  return candidates.filter((link) => {
    if (link.path === '/app/status') {
      return canViewSystemStatus(effective) || devMode
    }
    if (link.path === '/app/activity') {
      return canShowOpsActivityLink(effective) || devMode
    }
    return canShowOpsNavLink(effective, link.path) || devMode
  })
}
