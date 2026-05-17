import { Link } from 'react-router-dom'

export function CreatorsRoleGuide() {
  return (
    <section className="card card--wide creators-role-guide" aria-label="เส้นทางฐานข้อมูลครีเอเตอร์">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="creators-role-guide__flow">
        <li>
          <strong>ทีม Content / Account</strong> — เก็บรายชื่อ Creator · UGC · เรท และสถานะที่นี่
        </li>
        <li>
          เมื่อรับงาน UGC — เลือกครีเอเตอร์จากที่นี่ แล้วสร้างงานใน{' '}
          <Link to="/app/content">งานคอนเทนต์</Link>
        </li>
        <li>
          <strong>ลูกค้า</strong> — ไม่เข้าหน้านี้ · รับไฟล์งานที่{' '}
          <Link to="/app/client">พื้นที่ลูกค้า</Link> เมื่อทีมส่งมอบคอนเทนต์แล้ว
        </li>
        <li>ตั้งสถานะ「แบล็กลิสต์」เมื่อไม่ควรจ้างซ้ำ — ทีมเห็นก่อนมอบงาน</li>
      </ol>
    </section>
  )
}
