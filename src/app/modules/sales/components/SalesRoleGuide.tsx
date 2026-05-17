import { Link } from 'react-router-dom'

export function SalesRoleGuide() {
  return (
    <section className="card card--wide sales-role-guide" aria-label="เส้นทางการขาย">
      <h2>เส้นทางงานร่วมกับลูกค้า</h2>
      <ol className="sales-role-guide__flow">
        <li>
          <strong>Sales</strong> —{' '}
          <Link to="/app/crm">Lead ใน CRM</Link> → สร้างใบเสนอราคาที่นี่ → ส่งลิงก์ให้ลูกค้า
        </li>
        <li>
          <strong>ลูกค้า</strong> — เปิดลิงก์ใบเสนอราคา (หน้าสาธารณะ) ยอมรับ / ชำระ
        </li>
        <li>
          <strong>Finance</strong> —{' '}
          <Link to="/app/finance">ยืนยันชำระเงิน</Link> → สร้าง Customer อัตโนมัติ
        </li>
        <li>
          <strong>Account</strong> —{' '}
          <Link to="/app/onboarding">รับบรีฟ</Link> → ลูกค้าใช้{' '}
          <Link to="/app/client">Client Workspace</Link>
        </li>
        <li>
          <strong>ทุกทีม</strong> —{' '}
          <Link to="/app/work">งานของฉัน</Link> สรุป Lead และแชทจากลูกค้า
        </li>
      </ol>
    </section>
  )
}
