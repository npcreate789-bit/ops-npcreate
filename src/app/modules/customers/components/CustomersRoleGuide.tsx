import { Link } from 'react-router-dom'

export function CustomersRoleGuide() {
  return (
    <section className="card card--wide customers-role-guide" aria-label="เส้นทางลูกค้า 360">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="customers-role-guide__flow">
        <li>
          <strong>คลิกแบรนด์</strong> → เปิด <strong>ลูกค้า 360°</strong> รวมการเงิน · รับบรีฟ · โปรเจกต์ · แชท
        </li>
        <li>
          <strong>ทีม</strong> — Finance →{' '}
          <Link to="/app/onboarding">รับบรีฟ</Link> →{' '}
          <Link to="/app/projects">โปรเจกต์</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — ใช้{' '}
          <Link to="/app/client">พื้นที่ลูกค้า</Link> (บรีฟ · แชท · ชำระเงิน) แยกจากเมนูทีม
        </li>
        <li>
          คอลัมน์ <strong>ขั้นตอน</strong> = checklist ทีม (ไม่ใช่ % บรีฟฝั่งลูกค้า) — ดูรายละเอียดในรับบรีฟ
        </li>
      </ol>
    </section>
  )
}
