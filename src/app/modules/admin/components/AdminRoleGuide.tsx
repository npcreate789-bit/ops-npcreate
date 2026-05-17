import { Link } from 'react-router-dom'

export function AdminRoleGuide() {
  return (
    <section className="card card--wide admin-role-guide" aria-label="เส้นทางจัดการผู้ใช้">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="admin-role-guide__flow">
        <li>
          <strong>พนักงาน</strong> — สร้างที่「สร้างบัญชีพนักงาน」· มอบบทบาท Sales / Ads / Content ฯลฯ
        </li>
        <li>
          <strong>ลูกค้า (พอร์ทัล)</strong> — สร้างที่「สร้างบัญชีลูกค้าพอร์ทัล」เท่านั้น · ผูก 1 แบรนด์ · เข้า{' '}
          <Link to="/app/client">พื้นที่ลูกค้า</Link>
        </li>
        <li>
          อย่ามอบบทบาทพนักงานให้บัญชีลูกค้า — แยกบัญชีคนละประเภท · ถ้าเห็น「ผสมบทบาท」ให้แก้ทันที
        </li>
        <li>
          บันทึกการเปลี่ยนแปลง → <Link to="/app/admin/logs">Audit ผู้ดูแล</Link> ·{' '}
          <Link to="/app/activity">บันทึกกิจกรรม</Link>
        </li>
      </ol>
    </section>
  )
}
