import {
  canManageAdminUsers,
  canViewOpsCenter,
  canViewSystemStatus,
} from '../../../shared/auth/access'
import type { AppRole } from '../../../shared/types/roles'
import {
  canAccessNavPath,
  effectiveRolesForNav,
} from '../../config/navigation'

export interface StatusRelatedLink {
  path: string
  label: string
  hint: string
}

function statusDevMode(roles: AppRole[], configured: boolean): boolean {
  return !configured && effectiveRolesForNav(roles, configured).length > 0
}

function canShowStatusNavLink(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return true
  return canAccessNavPath(roles, path)
}

export function canAccessStatusPage(roles: AppRole[], configured: boolean): boolean {
  const effective = effectiveRolesForNav(roles, configured)
  return canViewSystemStatus(effective) || statusDevMode(roles, configured)
}

/** ลิงก์ไปโมดูลที่เกี่ยวกับระบบและการแก้ปัญหา */
export function statusRelatedLinksForRoles(
  roles: AppRole[],
  configured: boolean,
): StatusRelatedLink[] {
  const effective = effectiveRolesForNav(roles, configured)
  const devMode = statusDevMode(roles, configured)

  const candidates: StatusRelatedLink[] = [
    {
      path: '/app/help',
      label: 'ช่วยเหลือ',
      hint: 'คู่มือ · คีย์ลัด · เริ่มใช้งาน',
    },
    {
      path: '/app/start',
      label: 'เริ่มใช้งาน',
      hint: 'เช็กลิสต์ครั้งแรก',
    },
    {
      path: '/app/settings',
      label: 'ตั้งค่า',
      hint: 'บัญชีและการพับเมนู',
    },
    {
      path: '/app/ops',
      label: 'ศูนย์ Ops',
      hint: 'เช็กลิสต์ก่อน deploy',
    },
    {
      path: '/app/admin',
      label: 'ผู้ดูแลระบบ',
      hint: 'บัญชี · บทบาท · แพลตฟอร์ม',
    },
    {
      path: '/app/about',
      label: 'เกี่ยวกับ',
      hint: 'เวอร์ชันแอป',
    },
    {
      path: '/app/work',
      label: 'งานของฉัน',
      hint: 'งานค้างและแจ้งเตือน',
    },
  ]

  return candidates.filter((link) => {
    if (link.path === '/app/ops') {
      return canViewOpsCenter(effective) || devMode
    }
    if (link.path === '/app/admin') {
      return canManageAdminUsers(effective) || devMode
    }
    return canShowStatusNavLink(effective, link.path) || devMode
  })
}
