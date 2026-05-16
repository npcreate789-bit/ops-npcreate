import { canAccessNavPath, effectiveRolesForNav } from '../../config/navigation'
import type { AppRole } from '../../../shared/types/roles'

export interface StartTaskDef {
  id: string
  path: string
  labelTh: string
  hint: string
}

/** เช็กลิสต์เริ่มต้น — กรองตาม canAccessNavPath */
export const START_CHECKLIST_TASKS: StartTaskDef[] = [
  {
    id: 'home',
    path: '/app',
    labelTh: 'สำรวจหน้าหลัก',
    hint: 'ดูสถานะโมดูลและลิงก์เข้าแต่ละเฟส',
  },
  {
    id: 'help',
    path: '/app/help',
    labelTh: 'เปิดศูนย์ช่วยเหลือ',
    hint: 'เมนูตามบทบาทและ flow งานแนะนำ',
  },
  {
    id: 'status',
    path: '/app/status',
    labelTh: 'ตรวจสถานะระบบ',
    hint: 'การเชื่อมต่อ Supabase และเซสชัน',
  },
  {
    id: 'settings',
    path: '/app/settings',
    labelTh: 'ตั้งค่าชื่อที่แสดง',
    hint: 'หน้าตั้งค่าบัญชี — ชื่อในระบบ',
  },
  {
    id: 'search',
    path: '/app/search',
    labelTh: 'ลองค้นหารวม',
    hint: 'Lead · ลูกค้า · งาน ตาม RLS',
  },
  {
    id: 'work',
    path: '/app/work',
    labelTh: 'ดูงานของฉัน',
    hint: 'งานค้างและแจ้งเตือน',
  },
  {
    id: 'crm',
    path: '/app/crm',
    labelTh: 'เปิด CRM',
    hint: 'Lead และโอกาสขาย',
  },
]

export function startTasksVisibleForRoles(roles: AppRole[], configured: boolean): StartTaskDef[] {
  const effective = effectiveRolesForNav(roles, configured)
  return START_CHECKLIST_TASKS.filter((t) => canAccessNavPath(effective, t.path))
}
