import { Link } from 'react-router-dom'
import {
  canManageAdminUsers,
  canViewOpsCenter,
} from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { effectiveRolesForNav } from '../../../config/navigation'
import { withStatusContext } from '../statusNav'

interface Props {
  roles: AppRole[]
  configured: boolean
  search?: string | null
}

export function StatusRoleGuide({ roles, configured, search }: Props) {
  const effective = effectiveRolesForNav(roles, configured)
  const to = (path: string) => withStatusContext(path, search)
  const devMode = !configured && effective.length > 0
  const showOps = canViewOpsCenter(effective) || devMode
  const showAdmin = canManageAdminUsers(effective) || devMode

  return (
    <section className="card card--wide status-role-guide" aria-label="คู่มือสถานะระบบ">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <p className="muted status-role-guide__lead">
        ดูภาพรวมว่าแอปเชื่อมต่อ backend และเข้าสู่ระบบได้หรือไม่ — ไม่ใช่หน้างานประจำวัน
      </p>
      <ol className="status-role-guide__flow">
        <li>
          <strong>สถานะระบบ (หน้านี้)</strong> — ตรวจแอป · โดเมน · Supabase · เซสชัน · กด
          ปุ่มตรวจสอบอีกครั้ง หรือรอรีเฟรชอัตโนมัติ
        </li>
        {showOps && (
          <li>
            <strong>ศูนย์ Ops</strong> — เช็กลิสต์ migration · build · deploy ก่อนขึ้น production →{' '}
            <Link to={to('/app/ops')}>ศูนย์ Ops</Link>
          </li>
        )}
        <li>
          ปัญหาการใช้งานทั่วไป → <Link to={to('/app/help#start')}>ช่วยเหลือ → เริ่มใช้งาน</Link>
        </li>
        <li>
          ชื่อที่แสดงและพับเมนู → <Link to={to('/app/settings')}>ตั้งค่า</Link>
        </li>
        {showAdmin && (
          <li>
            สร้างบัญชี · มอบบทบาท → <Link to={to('/app/admin')}>ผู้ดูแลระบบ</Link>
          </li>
        )}
      </ol>
    </section>
  )
}
