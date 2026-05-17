import { Link } from 'react-router-dom'
import { withClientPreview } from '../clientNav'

interface ClientPortalGuideProps {
  isStaffPreview: boolean
  previewCustomerId?: string | null
}

function clientLink(path: string, previewCustomerId?: string | null) {
  return withClientPreview(path, previewCustomerId)
}

export function ClientPortalGuide({ isStaffPreview, previewCustomerId }: ClientPortalGuideProps) {
  if (isStaffPreview) {
    return (
      <section className="card card--wide client-portal-guide" aria-label="คู่มือพื้นที่ลูกค้า">
        <h2>โหมดตัวอย่าง (ทีมงาน)</h2>
        <p className="muted client-portal-guide__lead">
          หน้านี้คือสิ่งที่ลูกค้าเห็น — งานหลังบ้านทำที่โมดูลอื่น
        </p>
        <ol className="client-portal-guide__flow">
          <li>
            ลูกค้ากรอก{' '}
            <Link to={clientLink('/app/client/brief', previewCustomerId)}>บรีฟงาน</Link> → ทีมตรวจที่{' '}
            <Link to="/app/onboarding">รับบรีฟ</Link>
          </li>
          <li>
            ทีมยิงแอดบันทึกที่ <Link to="/app/ads">งานยิงแอด</Link> → ลูกค้าดูที่{' '}
            <Link to={clientLink('/app/client/reports', previewCustomerId)}>รายงาน</Link>
          </li>
          <li>
            คอนเทนต์ส่งมอบจาก <Link to="/app/content">งานคอนเทนต์</Link> → แสดงที่ภาพรวม
          </li>
          <li>
            สัญญา/ชำระ — ลูกค้าดู{' '}
            <Link to={clientLink('/app/client/payment', previewCustomerId)}>การชำระเงิน</Link> · ทีมที่{' '}
            <Link to="/app/renewals">ต่อสัญญา</Link> และ <Link to="/app/finance">การเงิน</Link>
          </li>
          <li>
            แชทแยกตามโปรเจกต์ — ลูกค้าและทีมคุยที่{' '}
            <Link to={clientLink('/app/client/chat', previewCustomerId)}>แชท</Link>
          </li>
        </ol>
      </section>
    )
  }

  return (
    <section className="card card--wide client-portal-guide" aria-label="ขั้นตอนใช้งาน">
      <h2>เริ่มต้นอย่างไร</h2>
      <ol className="client-portal-guide__flow">
        <li>
          <Link to="/app/client/brief">บรีฟงาน</Link> — กรอกข้อมูลแบรนด์และส่งบรีฟ
        </li>
        <li>
          <Link to="/app/client/projects">โปรเจกต์</Link> — ติดตามความคืบหน้าและเปิดแชท
        </li>
        <li>
          <Link to="/app/client/reports">รายงาน</Link> — ดูผลโฆษณารายวัน/รายเดือน
        </li>
        <li>
          <Link to="/app/client/payment">การชำระเงิน</Link> — วันสิ้นสัญญาและรายการชำระ
        </li>
        <li>
          <Link to="/app/client/chat">แชท</Link> — คุยกับทีม NP Create ได้ตลอด
        </li>
      </ol>
    </section>
  )
}
