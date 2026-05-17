import { Link } from 'react-router-dom'

export function OnboardingRoleGuide() {
  return (
    <section className="card card--wide onboarding-role-guide" aria-label="เส้นทางรับบรีฟ">
      <h2>ขั้นตอนง่าย ๆ</h2>
      <ol className="onboarding-role-guide__flow">
        <li>
          <strong>Finance</strong> — ยืนยันชำระแล้วลูกค้าเปิดใช้งาน →{' '}
          <Link to="/app/finance">การเงิน</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — กรอกบรีฟ 4 ขั้นใน{' '}
          <Link to="/app/client/brief">Client Workspace</Link> แล้วกดส่ง
        </li>
        <li>
          <strong>Account (หน้านี้)</strong> — ตรวจ checklist 8 ข้อให้ครบ → มอบหมายทีม
        </li>
        <li>
          <strong>Ops / Account</strong> — สร้าง{' '}
          <Link to="/app/projects">โปรเจกต์</Link> แยกงานตามบริการ
        </li>
        <li>
          <strong>Ads</strong> — เมื่อพร้อมยิงแอด ไปบันทึกผลรายวัน
        </li>
      </ol>
    </section>
  )
}
