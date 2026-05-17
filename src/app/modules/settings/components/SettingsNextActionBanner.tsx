import { Link } from 'react-router-dom'
import type { UserProfile } from '../../../../shared/auth/AuthProvider'
import { withSettingsContext } from '../settingsNav'

interface Props {
  configured: boolean
  profile: UserProfile | null
  profileLoadError: string | null
  search?: string | null
}

export function SettingsNextActionBanner({
  configured,
  profile,
  profileLoadError,
  search,
}: Props) {
  let tone: 'warn' | 'info' | 'ok' = 'info'
  let title = ''
  let detail = ''
  let cta: { label: string; to: string } | null = null

  if (profileLoadError) {
    tone = 'warn'
    title = 'โหลดข้อมูลบัญชีไม่ครบ'
    detail = profileLoadError
    cta = { label: 'ไปสถานะระบบ', to: withSettingsContext('/app/status', search) }
  } else if (!configured) {
    tone = 'info'
    title = 'โหมดพัฒนา'
    detail = 'บันทึกชื่อจะไม่ส่งไป Supabase — ตั้ง VITE_SUPABASE_URL และ ANON_KEY ใน .env.local'
    cta = { label: 'ศูนย์ Ops', to: withSettingsContext('/app/ops', search) }
  } else if (profile?.must_change_password) {
    tone = 'warn'
    title = 'ต้องเปลี่ยนรหัสผ่าน'
    detail = 'บัญชีนี้ถูกตั้งให้เปลี่ยนรหัสเมื่อเข้าใช้ครั้งถัดไป — ติดต่อผู้ดูแลหากยังไม่ได้รับลิงก์'
    cta = { label: 'ผู้ดูแลระบบ', to: withSettingsContext('/app/admin', search) }
  } else if (!profile?.full_name?.trim()) {
    tone = 'warn'
    title = 'ตั้งชื่อที่แสดง'
    detail = 'ชื่อจะปรากฏในงาน แชท และรายงาน — กรอกด้านล่างแล้วกดบันทึก'
    cta = { label: 'ไปที่ฟอร์ม', to: '#account' }
  } else if (configured && profile && profile.roles.length === 0) {
    tone = 'warn'
    title = 'ยังไม่มีบทบาทในระบบ'
    detail = 'ติดต่อ CEO หรือ Operations เพื่อมอบสิทธิ์เข้าโมดูล'
    cta = { label: 'ช่วยเหลือ', to: withSettingsContext('/app/help', search) }
  } else if (profile) {
    tone = 'ok'
    title = 'บัญชีพร้อมใช้งาน'
    detail = 'ปรับการพับเมนูได้ที่ส่วนการจัดวางหน้าจอด้านล่าง'
    cta = { label: 'การจัดวาง', to: '#layout' }
  }

  if (!title) return null

  const className =
    tone === 'warn'
      ? 'crm-banner crm-banner--warn settings-next-banner'
      : tone === 'ok'
        ? 'crm-banner settings-next-banner'
        : 'crm-banner settings-next-banner'

  const ctaNode =
    cta?.to.startsWith('#') ? (
      <a href={cta.to} className="crm-btn crm-btn--ghost crm-btn--sm">
        {cta.label}
      </a>
    ) : cta ? (
      <Link to={cta.to} className="crm-btn crm-btn--ghost crm-btn--sm">
        {cta.label}
      </Link>
    ) : null

  return (
    <section className={className} aria-live="polite">
      <div className="settings-next-banner__inner">
        <div>
          <strong>{title}</strong>
          {detail ? <p className="muted settings-next-banner__detail">{detail}</p> : null}
        </div>
        {ctaNode}
      </div>
    </section>
  )
}
