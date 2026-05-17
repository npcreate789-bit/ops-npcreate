import { Link } from 'react-router-dom'

export function RenewalsRoleGuide() {
  return (
    <section className="card card--wide renewals-role-guide" aria-label="เส้นทางต่อสัญญา">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="renewals-role-guide__flow">
        <li>
          <strong>Account / Sales</strong> — ติดตามลูกค้าที่สัญญาใกล้หมด อัปเดตสถานะเคส และขยายสัญญาที่นี่
        </li>
        <li>
          ส่งใบเสนอราคา → <Link to="/app/sales">Sales</Link> · ยืนยันชำระ →{' '}
          <Link to="/app/finance">การเงิน</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — ดูวันสิ้นสัญญาและรายการชำระใน{' '}
          <Link to="/app/client/payment">พื้นที่ลูกค้า → การชำระเงิน</Link> (ไม่จัดการเคสต่อสัญญาที่นี่)
        </li>
        <li>คลิกแบรนด์ → เปิด 360° หรือใช้ลิงก์ด่วน — ปุ่ม「+3 เดือน」ขยายสัญญาหลังตกลงแล้ว</li>
      </ol>
    </section>
  )
}
