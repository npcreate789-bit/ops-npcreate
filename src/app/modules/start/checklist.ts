import { canAccessNavPath, effectiveRolesForNav } from '../../config/navigation'
import type { AppRole } from '../../../shared/types/roles'

export interface StartTaskDef {
  id: string
  path: string
  labelTh: string
  hint: string
}

/** เช็กลิสต์เริ่มต้น — ตาม flow งานจริง */
export const START_CHECKLIST_TASKS: StartTaskDef[] = [
  {
    id: 'home',
    path: '/app',
    labelTh: 'ดูภาพรวมหน้าหลัก',
    hint: 'งานเร่งด่วนและทางลัด',
  },
  {
    id: 'work',
    path: '/app/work',
    labelTh: 'เปิดงานของฉัน',
    hint: 'งานค้างและแจ้งเตือนรวมศูนย์',
  },
  {
    id: 'crm',
    path: '/app/crm',
    labelTh: 'เปิด CRM',
    hint: 'Lead และโอกาสขาย',
  },
  {
    id: 'help',
    path: '/app/help',
    labelTh: 'อ่าน Flow งานหลัก',
    hint: 'ในหน้าช่วยเหลือ',
  },
  {
    id: 'settings',
    path: '/app/settings',
    labelTh: 'ตั้งค่าชื่อและหน้าจอ',
    hint: 'บัญชีและพับแถบเมนู',
  },
]

export function startTasksVisibleForRoles(roles: AppRole[], configured: boolean): StartTaskDef[] {
  const effective = effectiveRolesForNav(roles, configured)
  return START_CHECKLIST_TASKS.filter((t) => canAccessNavPath(effective, t.path))
}
