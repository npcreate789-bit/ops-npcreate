import { Link } from 'react-router-dom'
import { withOpsContext } from '../opsNav'

interface Props {
  search?: string | null
}

export function OpsRoleGuide({ search }: Props) {
  const to = (path: string) => withOpsContext(path, search)

  return (
    <section className="card card--wide ops-role-guide" aria-label="คู่มือศูนย์ Ops">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <p className="muted ops-role-guide__lead">
        สำหรับ CEO · Operations · Dev — ตรวจความพร้อมก่อน deploy ไม่ใช่หน้างานประจำวันของลูกค้า
      </p>
      <ol className="ops-role-guide__flow">
        <li>
          ตรวจ <Link to={to('/app/status')}>สถานะระบบ</Link> — Supabase · ฐานข้อมูล · โดเมน
        </li>
        <li>ทำเช็กลิสต์ด้านล่าง — ตั้งค่า env → migration → build → deploy</li>
        <li>
          งานลูกค้าจริงอยู่ที่ <Link to={to('/app/customers')}>ลูกค้า 360°</Link> ·{' '}
          <Link to={to('/app/onboarding')}>รับบรีฟ</Link> ·{' '}
          <Link to={to('/app/projects')}>โปรเจกต์</Link>
        </li>
        <li>
          ลูกค้าเห็นหน้า <Link to={to('/app/client')}>พื้นที่ลูกค้า</Link> — ทีมดูตัวอย่างด้วย{' '}
          <code>?preview=</code>
        </li>
        <li>
          งานค้างทีมรวมที่ <Link to={to('/app/work')}>งานของฉัน</Link> · รายละเอียดใน{' '}
          <Link to={to('/app/help')}>ช่วยเหลือ</Link>
        </li>
      </ol>
    </section>
  )
}
