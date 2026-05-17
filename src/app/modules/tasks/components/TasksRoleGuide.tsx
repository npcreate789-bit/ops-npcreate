import { Link } from 'react-router-dom'

export function TasksRoleGuide() {
  return (
    <section className="card card--wide tasks-role-guide" aria-label="เส้นทางงานภายใน">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="tasks-role-guide__flow">
        <li>
          <strong>ทีมภายใน</strong> — มอบหมายและติดตามงานหลังบ้านที่นี่ (ลูกค้าไม่เห็นหน้านี้)
        </li>
        <li>
          ผูกงานกับ <Link to="/app/projects">โปรเจกต์</Link> หรือลูกค้า — เปิดจาก{' '}
          <Link to="/app/customers">ลูกค้า 360°</Link> หรือหน้าโปรเจกต์
        </li>
        <li>
          <strong>ลูกค้า</strong> — ติดตามความคืบหน้าและแชทใน{' '}
          <Link to="/app/client/projects">พื้นที่ลูกค้า → โปรเจกต์</Link> และ{' '}
          <Link to="/app/client/chat">แชท</Link>
        </li>
        <li>คลิกแถวงาน → อัปเดตสถานะ · กำหนดเสร็จ · มอบหมายผู้รับผิดชอบ</li>
      </ol>
    </section>
  )
}
