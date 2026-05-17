import { Link } from 'react-router-dom'

export function ProjectsRoleGuide() {
  return (
    <section className="card card--wide projects-role-guide" aria-label="เส้นทางโปรเจกต์">
      <h2>ขั้นตอนง่าย ๆ</h2>
      <ol className="projects-role-guide__flow">
        <li>
          <strong>Finance</strong> — ยืนยันชำระ →{' '}
          <Link to="/app/onboarding">รับบรีฟ</Link>
        </li>
        <li>
          <strong>Account / Ops</strong> — สร้างโปรเจกต์ที่นี่ → มอบงานใน Tasks
        </li>
        <li>
          <strong>ลูกค้า</strong> — ดูความคืบหน้าและแชทใน{' '}
          <Link to="/app/client/projects">Client Workspace</Link>
        </li>
        <li>
          <strong>Ads / Content</strong> — ทำงานตามบริการ → อัปเดตสถานะและ % ความคืบหน้า
        </li>
      </ol>
    </section>
  )
}
