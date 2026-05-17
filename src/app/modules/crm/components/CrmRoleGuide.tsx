import { Link } from 'react-router-dom'

export function CrmRoleGuide() {
  return (
    <section className="card card--wide crm-role-guide" aria-label="บทบาทและขั้นตอน">
      <h2>เส้นทางงานร่วมกับลูกค้า</h2>
      <ol className="crm-role-guide__flow">
        <li>
          <strong>Sales</strong> — Lead ใน CRM → ใบเสนอราคา
        </li>
        <li>
          <strong>Finance</strong> —{' '}
          <Link to="/app/finance">ยืนยันชำระเงิน</Link>
        </li>
        <li>
          <strong>Account</strong> —{' '}
          <Link to="/app/onboarding">รับบรีฟ</Link> หลังปิดการขาย
        </li>
        <li>
          <strong>ลูกค้า</strong> —{' '}
          <Link to="/app/client">Client Workspace</Link> (บรีฟ · แชท · รายงาน)
        </li>
        <li>
          <strong>ทุกทีม</strong> —{' '}
          <Link to="/app/work">งานของฉัน</Link> รวมนัด Lead และแชทจากลูกค้า
        </li>
      </ol>
    </section>
  )
}
