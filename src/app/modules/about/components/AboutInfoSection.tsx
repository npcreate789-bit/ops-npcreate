import { useAuth } from '../../../../shared/auth/AuthProvider'
import { APP_DESCRIPTION, APP_PACKAGE_NAME, APP_VERSION } from '../appMeta'
import '../about.css'

export function AboutInfoSection() {
  const { configured } = useAuth()
  const mode = import.meta.env.MODE

  return (
    <>
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
    </>
  )
}
