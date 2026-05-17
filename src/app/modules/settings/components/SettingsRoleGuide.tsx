import { Link } from 'react-router-dom'
import {
  canManageAdminUsers,
  canViewOpsCenter,
  canViewSystemStatus,
} from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { effectiveRolesForNav } from '../../../config/navigation'
import { withSettingsContext } from '../settingsNav'

interface Props {
  roles: AppRole[]
  configured: boolean
  search?: string | null
}

export function SettingsRoleGuide({ roles, configured, search }: Props) {
  const effective = effectiveRolesForNav(roles, configured)
  const to = (path: string) => withSettingsContext(path, search)
  const showAdmin = canManageAdminUsers(effective) || (!configured && effective.length > 0)
  const showOps = canViewOpsCenter(effective) || (!configured && effective.length > 0)
  const showStatus = canViewSystemStatus(effective) || (!configured && effective.length > 0)
  const isClientOnly =
    effective.length > 0 && effective.every((r) => r === 'client')

  return (
    <section className="card card--wide settings-role-guide" aria-label="คู่มือตั้งค่า">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <p className="muted settings-role-guide__lead">
        ตั้งค่าส่วนตัวของคุณ — ไม่ใช่จัดการผู้ใช้ทั้งบริษัทหรือตั้งค่าแพลตฟอร์ม
      </p>
      <ol className="settings-role-guide__flow">
        <li>
          <strong>บัญชี</strong> — ตรวจรหัสเข้าใช้ · ตั้งชื่อที่แสดง · ดูบทบาทที่ได้รับ (แก้บทบาทต้องผ่านผู้ดูแล)
        </li>
        <li>
          <strong>การจัดวาง</strong> — พับแถบเมนูหรือขยายได้ที่{' '}
          <a href="#layout">ส่วนการจัดวางหน้าจอ</a>
        </li>
        {showAdmin && (
          <li>
            สร้างบัญชีพนักงาน/ลูกค้า · มอบบทบาท · ตั้งค่าเจ้าของ lead →{' '}
            <Link to={to('/app/admin')}>ผู้ดูแลระบบ</Link>
          </li>
        )}
        {showStatus && (
          <li>
            ตรวจว่าระบบเชื่อมต่อได้ → <Link to={to('/app/status')}>สถานะระบบ</Link>
            {showOps ? (
              <>
                {' '}
                · เช็กลิสต์ deploy → <Link to={to('/app/ops')}>ศูนย์ Ops</Link>
              </>
            ) : null}
          </li>
        )}
        {isClientOnly && (
          <li>
            งานและรายงานของแบรนด์ → <Link to={to('/app/client')}>พื้นที่ลูกค้า</Link>
          </li>
        )}
        <li>
          คู่มือและทางลัด → <Link to={to('/app/help')}>ช่วยเหลือ</Link>
        </li>
      </ol>
    </section>
  )
}
