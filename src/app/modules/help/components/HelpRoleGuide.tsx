import { Link } from 'react-router-dom'
import {
  canManageAdminUsers,
  canViewOpsCenter,
  canViewSystemStatus,
  canViewWorkHub,
  hasClientPortalStaffPreview,
} from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import { effectiveRolesForNav } from '../../../config/navigation'
import { labelFlowSectionTitle } from '../helpLabels'
import { withHelpContext } from '../helpNav'

interface Props {
  roles: AppRole[]
  configured: boolean
  search?: string | null
}

export function HelpRoleGuide({ roles, configured, search }: Props) {
  const effective = effectiveRolesForNav(roles, configured)
  const to = (path: string) => withHelpContext(path, search)
  const devMode = !configured && effective.length > 0
  const isClientOnly =
    effective.length > 0 && effective.every((r) => r === 'client')
  const showWork = canViewWorkHub(effective) || devMode
  const showAdmin = canManageAdminUsers(effective) || devMode
  const showOps = canViewOpsCenter(effective) || devMode
  const showStatus = canViewSystemStatus(effective) || devMode
  const showClientPortal =
    isClientOnly || hasClientPortalStaffPreview(effective) || devMode

  if (isClientOnly) {
    return (
      <section
        id="guide"
        className="card card--wide help-role-guide help-anchor"
        aria-label="คู่มือลูกค้า"
      >
        <h2>{labelFlowSectionTitle(true)}</h2>
        <p className="muted help-role-guide__lead">
          งานทั้งหมดอยู่ใน <Link to={to('/app/client')}>พื้นที่ลูกค้า</Link> — สลับแท็บด้านบน
        </p>
        <ol className="help-role-guide__flow">
          <li>
            <Link to={to('/app/client/payment')}>การชำระเงิน</Link> — ดูสัญญา · แจ้งสลิปผ่านแชท
          </li>
          <li>
            <Link to={to('/app/client/brief')}>บรีฟงาน</Link> — กรอกข้อมูลแบรนด์ให้ครบ
          </li>
          <li>
            <Link to={to('/app/client/projects')}>โปรเจกต์</Link> — ติดตามความคืบหน้า
          </li>
          <li>
            <Link to={to('/app/client/chat')}>แชท</Link> — คุยกับทีม NP Create
          </li>
          <li>
            <Link to={to('/app/client/reports')}>รายงาน</Link> — ผลโฆษณาและสรุปรายเดือน
          </li>
          <li>
            ตั้งชื่อที่แสดง → <Link to={to('/app/settings')}>ตั้งค่า</Link>
          </li>
        </ol>
      </section>
    )
  }

  return (
    <section
      id="guide"
      className="card card--wide help-role-guide help-anchor"
      aria-label="คู่มือทีมงาน"
    >
      <h2>{labelFlowSectionTitle(false)}</h2>
      <p className="muted help-role-guide__lead">
        ลำดับงานขาย → รับบรีฟ → ดำเนินงาน — ลูกค้าเห็นเฉพาะ{' '}
        <Link to={to('/app/client')}>พื้นที่ลูกค้า</Link>
      </p>
      <ol className="help-role-guide__flow">
        <li>
          <Link to={to('/app/crm')}>ลูกค้าเป้าหมาย</Link> →{' '}
          <Link to={to('/app/sales')}>ใบเสนอราคา</Link> → ลูกค้ายอมรับจากลิงก์
        </li>
        <li>
          <Link to={to('/app/finance')}>การเงิน</Link> ยืนยันชำระ →{' '}
          <Link to={to('/app/onboarding')}>รับบรีฟ</Link> →{' '}
          <Link to={to('/app/projects')}>โปรเจกต์</Link>
        </li>
        {showWork && (
          <li>
            งานค้างและแชทรวมที่ <Link to={to('/app/work')}>งานของฉัน</Link>
          </li>
        )}
        {showClientPortal && !isClientOnly && (
          <li>
            ตัวอย่างหน้าลูกค้า → <Link to={to('/app/client')}>พื้นที่ลูกค้า</Link>
            {hasClientPortalStaffPreview(effective) ? ' (เลือกแบรนด์หรือ ?preview=)' : null}
          </li>
        )}
        {showStatus && (
          <li>
            ตรวจระบบ → <Link to={to('/app/status')}>สถานะระบบ</Link>
            {showOps ? (
              <>
                {' '}
                · deploy → <Link to={to('/app/ops')}>ศูนย์ Ops</Link>
              </>
            ) : null}
          </li>
        )}
        {showAdmin && (
          <li>
            สร้างบัญชี · มอบบทบาท → <Link to={to('/app/admin')}>ผู้ดูแลระบบ</Link>
          </li>
        )}
        <li>
          บัญชีและพับเมนู → <Link to={to('/app/settings')}>ตั้งค่า</Link>
        </li>
      </ol>
    </section>
  )
}
