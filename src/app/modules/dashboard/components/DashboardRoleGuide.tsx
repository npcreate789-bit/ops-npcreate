import { Link } from 'react-router-dom'

export function DashboardRoleGuide() {
  return (
    <section className="card card--wide dashboard-role-guide" aria-label="เส้นทางแดชบอร์ด">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="dashboard-role-guide__flow">
        <li>
          <strong>CEO / Ops / Admin</strong> — ดูตัวเลขวันนี้และเดือนนี้ที่นี่ก่อน แล้วกดการ์ดหรือ「ดู →」เพื่อเปิดโมดูลจริง
        </li>
        <li>
          สรุปรายเดือนลึกขึ้น → <Link to="/app/reports">รายงานขั้นสูง</Link> · ช่วง 7 วัน →{' '}
          <Link to="/app/weekly">สรุปรายสัปดาห์</Link>
        </li>
        <li>
          แอดวันนี้มาจาก <Link to="/app/ads">งานยิงแอด</Link> · การเงินจาก{' '}
          <Link to="/app/finance">การเงิน</Link> · ลูกค้าจาก{' '}
          <Link to="/app/customers">ลูกค้า 360°</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — ใช้ <Link to="/app/client">พื้นที่ลูกค้า</Link> ไม่ใช่หน้านี้
        </li>
      </ol>
    </section>
  )
}
