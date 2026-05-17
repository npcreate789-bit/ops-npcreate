import { Link } from 'react-router-dom'

interface AssistantRoleGuideProps {
  showClientPortal?: boolean
}

export function AssistantRoleGuide({ showClientPortal }: AssistantRoleGuideProps) {
  return (
    <section className="card card--wide assistant-role-guide" aria-label="เส้นทางผู้ช่วย AI">
      <h2>ใช้หน้านี้อย่างไร</h2>
      <ol className="assistant-role-guide__flow">
        <li>
          <strong>ทีมภายใน</strong> — เลือกเทมเพลต แล้วกดสร้างข้อความจากข้อมูลในระบบ (แก้ไขก่อนส่งได้)
        </li>
        <li>
          ไม่ใช้ ChatGPT / OpenAI — ข้อความมาจากเทมเพลต + ตัวเลขลูกค้าที่มีสิทธิ์ดูเท่านั้น
        </li>
        <li>
          เทมเพลตแอด / ต่อสัญญา / Onboarding — <strong>ต้องเลือกลูกค้า</strong> ก่อนสร้าง
        </li>
        <li>
          <strong>ลูกค้า</strong> — ถามผู้ช่วยในหน้า{' '}
          {showClientPortal ? (
            <Link to="/app/client">พื้นที่ลูกค้า</Link>
          ) : (
            'พื้นที่ลูกค้า'
          )}{' '}
          (คำถามสั้น ๆ จากรายงานของตัวเอง)
        </li>
      </ol>
    </section>
  )
}
