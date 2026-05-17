import { Link } from 'react-router-dom'

export function ContentRoleGuide() {
  return (
    <section className="card card--wide content-role-guide" aria-label="เส้นทางงานคอนเทนต์">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="content-role-guide__flow">
        <li>
          <strong>ทีม Content</strong> — สร้างงาน ติดตามสถานะ และใส่ลิงก์ไฟล์ส่งมอบที่นี่
        </li>
        <li>
          <strong>Account</strong> — ตรวจบรีฟใน{' '}
          <Link to="/app/onboarding">รับบรีฟ</Link> · ภาพรวมใน{' '}
          <Link to="/app/customers">ลูกค้า 360°</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — เมื่อสถานะ <em>ส่งมอบแล้ว</em> และมีลิงก์ไฟล์ จะเห็นใน{' '}
          <Link to="/app/client">พื้นที่ลูกค้า</Link> หัวข้อ「คอนเทนต์ที่ส่งมอบแล้ว」(ไม่สร้างงานที่นี่)
        </li>
        <li>คลิกแถวงาน → แก้ไข · ตั้งกำหนดส่ง · อัปเดตสถานะก่อนส่งมอบ</li>
      </ol>
    </section>
  )
}
