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

export interface SettingsRelatedLink {
  path: string
  label: string
  hint: string
}

function settingsDevMode(roles: AppRole[], configured: boolean): boolean {
  return !configured && effectiveRolesForNav(roles, configured).length > 0
}

function canShowSettingsNavLink(roles: AppRole[], path: string): boolean {
  if (roles.length === 0) return true
  return canAccessNavPath(roles, path)
}

/** ลิงก์ไปโมดูลที่เกี่ยวกับบัญชีและระบบ */
export function settingsRelatedLinksForRoles(
  roles: AppRole[],
  configured: boolean,
): SettingsRelatedLink[] {
  const effective = effectiveRolesForNav(roles, configured)
  const devMode = settingsDevMode(roles, configured)

  const candidates: SettingsRelatedLink[] = [
    {
      path: '/app/help',
      label: 'ช่วยเหลือ',
      hint: 'คู่มือและคีย์ลัด',
    },
    {
      path: '/app/start',
      label: 'เริ่มใช้งาน',
      hint: 'เช็กลิสต์ครั้งแรก',
    },
    {
      path: '/app/work',
      label: 'งานของฉัน',
      hint: 'งานค้างและแจ้งเตือน',
    },
    {
      path: '/app/admin',
      label: 'ผู้ดูแลระบบ',
      hint: 'สร้างบัญชี · มอบบทบาท · ตั้งค่าแพลตฟอร์ม',
    },
    {
      path: '/app/status',
      label: 'สถานะระบบ',
      hint: 'ตรวจ Supabase และโดเมน',
    },
    {
      path: '/app/ops',
      label: 'ศูนย์ Ops',
      hint: 'เช็กลิสต์ก่อน deploy',
    },
    {
      path: '/app/client',
      label: 'พื้นที่ลูกค้า',
      hint: 'หน้าที่ลูกค้าเห็น',
    },
    {
      path: '/app/about',
      label: 'เกี่ยวกับ',
      hint: 'เวอร์ชันแอป',
    },
  ]

  return candidates.filter((link) => {
    if (link.path === '/app/admin') {
      return canManageAdminUsers(effective) || devMode
    }
    if (link.path === '/app/status') {
      return canViewSystemStatus(effective) || devMode
    }
    if (link.path === '/app/ops') {
      return canViewOpsCenter(effective) || devMode
    }
    return canShowSettingsNavLink(effective, link.path) || devMode
  })
}
