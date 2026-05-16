import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { APP_DESCRIPTION, APP_PACKAGE_NAME, APP_VERSION } from '../appMeta'
import '../../../modules/crm/crm.css'
import '../../../modules/phase2/phase2.css'
import '../about.css'

export function AboutPage() {
  const { configured } = useAuth()
  const mode = import.meta.env.MODE

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>เกี่ยวกับระบบ</h1>
          <p className="muted">ข้อมูลเวอร์ชันและสภาพแวดล้อม — NP Create Operating System</p>
        </div>
        <Link to="/app/help" className="crm-btn crm-btn--ghost">
          ช่วยเหลือ
        </Link>
      </header>

      <section className="card card--wide">
        <dl className="about-spec">
          <div>
            <dt>ผลิตภัณฑ์</dt>
            <dd>NP Create Operating System</dd>
          </div>
          <div>
            <dt>แพ็กเกจ</dt>
            <dd>
              <code className="about-code">{APP_PACKAGE_NAME}</code>
            </dd>
          </div>
          <div>
            <dt>เวอร์ชัน</dt>
            <dd>
              <code className="about-code">{APP_VERSION}</code>
            </dd>
          </div>
          <div>
            <dt>โหมดรันไทม์</dt>
            <dd>
              <code className="about-code">{mode}</code>
            </dd>
          </div>
          <div>
            <dt>Backend</dt>
            <dd>{configured ? 'เชื่อมต่อ Supabase' : 'โหมดพัฒนา (ไม่ได้ตั้งค่า Supabase)'}</dd>
          </div>
        </dl>
        <p className="muted about-blurb">{APP_DESCRIPTION}</p>
      </section>

      <section className="card card--wide">
        <h2>ลิงก์ที่เกี่ยวข้อง</h2>
        <ul className="flow-list">
          <li>
            <Link to="/app">หน้าหลัก</Link> — ภาพรวมโมดูล
          </li>
          <li>
            <Link to="/app/start">เริ่มใช้งาน</Link> — เช็กลิสต์แรก
          </li>
          <li>
            <Link to="/app/keyboard">ศูนย์คีย์ลัด</Link> — ปุ่มลัดในระบบ
          </li>
          <li>
            <Link to="/app/status">สถานะระบบ</Link> — ตรวจการเชื่อมต่อ
          </li>
        </ul>
      </section>
    </div>
  )
}
