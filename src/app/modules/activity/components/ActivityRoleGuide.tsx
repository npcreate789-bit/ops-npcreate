import { Link } from 'react-router-dom'

interface ActivityRoleGuideProps {
  showAdminAudit?: boolean
}

export function ActivityRoleGuide({ showAdminAudit }: ActivityRoleGuideProps) {
  return (
    <section className="card card--wide activity-role-guide" aria-label="เส้นทางบันทึกกิจกรรม">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="activity-role-guide__flow">
        <li>
          <strong>CEO / Ops / Account</strong> — ดูว่าใครทำอะไรกับข้อมูลใด เมื่อไหร่ (อ่านอย่างเดียว)
        </li>
        <li>
          เลือกหมวดด้านล่างหรือกรองพนักงาน/วันที่ — คลิก「เปิด」เพื่อไปโมดูลที่เกี่ยวข้อง
        </li>
        <li>
          ภาพรวมตัวเลข → <Link to="/app/dashboard">แดชบอร์ด</Link>
          {showAdminAudit ? (
            <>
              {' '}
              · บันทึกผู้ดูแลละเอียด →{' '}
              <Link to="/app/admin/logs">Audit ผู้ดูแลระบบ</Link>
            </>
          ) : null}
        </li>
        <li>
          ไทม์ไลน์รายลูกค้า → เปิดจาก <Link to="/app/customers">ลูกค้า 360°</Link> แท็บไทม์ไลน์
        </li>
      </ol>
    </section>
  )
}
