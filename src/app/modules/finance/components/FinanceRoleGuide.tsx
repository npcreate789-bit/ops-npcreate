import { Link } from 'react-router-dom'

export function FinanceRoleGuide() {
  return (
    <section className="card card--wide finance-role-guide no-print" aria-label="เส้นทางการเงิน">
      <h2>เส้นทางงานร่วมกับลูกค้า</h2>
      <ol className="finance-role-guide__flow">
        <li>
          <strong>Sales</strong> — ใบเสนอราคาสถานะรอชำระ → เปิดบันทึกชำระจากลิงก์ Finance
        </li>
        <li>
          <strong>ลูกค้า</strong> — ชำระและแจ้งสลิปผ่าน{' '}
          <Link to="/app/client/chat">แชท</Link> หรือดูสถานะใน{' '}
          <Link to="/app/client/payment">การชำระเงิน</Link>
        </li>
        <li>
          <strong>Finance / Admin</strong> — ยืนยันชำระที่นี่ → ออกใบเสร็จ/ใบกำกับ
        </li>
        <li>
          <strong>Account</strong> —{' '}
          <Link to="/app/onboarding">รับบรีฟ</Link> หลังลูกค้า Active
        </li>
        <li>
          <strong>ทุกทีม</strong> —{' '}
          <Link to="/app/work">งานของฉัน</Link> แสดงรายการครบกำหนดชำระ
        </li>
      </ol>
    </section>
  )
}
