import { Link } from 'react-router-dom'

export function ReportsRoleGuide() {
  return (
    <section className="card card--wide reports-role-guide" aria-label="เส้นทางรายงานรายเดือน">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="reports-role-guide__flow">
        <li>
          <strong>CEO / Ops / Account</strong> — ดูตัวเลขรวมรายเดือนที่นี่ แล้วกดการ์ดหรือ「ไปจัดการ」เพื่อเปิดโมดูลที่เกี่ยวข้อง
        </li>
        <li>
          ต้องการภาพรวมสัปดาห์ปัจจุบัน →{' '}
          <Link to="/app/weekly">สรุปรายสัปดาห์</Link> (ช่วงวันจันทร์–อาทิตย์)
        </li>
        <li>
          ตัวเลขแอดมาจาก <Link to="/app/ads">งานยิงแอด</Link> · การเงินจาก{' '}
          <Link to="/app/finance">การเงิน</Link> · คอนเทนต์จาก{' '}
          <Link to="/app/content">งานคอนเทนต์</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — ไม่เข้าหน้านี้ · ดูรายงานรายเดือนของแบรนด์ตัวเองที่{' '}
          <Link to="/app/client/reports">พื้นที่ลูกค้า → รายงาน</Link>
        </li>
      </ol>
    </section>
  )
}
