import { Link } from 'react-router-dom'
import type { UserProfile } from '../../../../shared/auth/AuthProvider'
import { effectiveRolesForNav } from '../../../config/navigation'
import { withHelpContext } from '../helpNav'

interface Props {
  configured: boolean
  profile: UserProfile | null
  search?: string | null
}

export function HelpNextActionBanner({ configured, profile, search }: Props) {
  const roles = profile?.roles ?? []
  const effective = effectiveRolesForNav(roles, configured)
  const isClientOnly =
    effective.length > 0 && effective.every((r) => r === 'client')

  let tone: 'warn' | 'info' | 'ok' = 'info'
  let title = ''
  let detail = ''
  let cta: { label: string; to: string } | null = null

  if (!configured) {
    tone = 'info'
    title = 'โหมดพัฒนา'
    detail = 'แสดงเมนูและคู่มือครบ — ใช้ทดสอบ flow ก่อนเชื่อม Supabase จริง'
    cta = { label: 'ศูนย์ Ops', to: withHelpContext('/app/ops', search) }
  } else if (configured && roles.length === 0) {
    tone = 'warn'
    title = 'กำลังโหลดบทบาท'
    detail = 'ถ้าค้างนาน ลองรีเฟรชหรือติดต่อผู้ดูแลเพื่อมอบสิทธิ์'
    cta = { label: 'ตั้งค่า', to: withHelpContext('/app/settings', search) }
  } else if (isClientOnly) {
    tone = 'ok'
    title = 'ลูกค้าใหม่? เริ่มที่นี่'
    detail = 'ดูการชำระเงิน · กรอกบรีฟ · แชททีม — อยู่ในแท็บพื้นที่ลูกค้า'
    cta = { label: 'พื้นที่ลูกค้า', to: withHelpContext('/app/client', search) }
  } else {
    tone = 'ok'
    title = 'พนักงานใหม่? ทำตามลำดับ'
    detail = 'เช็กลิสต์ด้านล่าง → อ่าน Flow งาน → เปิดเมนูตามบทบาท'
    cta = { label: 'เช็กลิสต์', to: '#start' }
  }

  if (!title) return null

  const className =
    tone === 'warn'
      ? 'crm-banner crm-banner--warn help-next-banner'
      : 'crm-banner help-next-banner'

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
      <div className="help-next-banner__inner">
        <div>
          <strong>{title}</strong>
          {detail ? <p className="muted help-next-banner__detail">{detail}</p> : null}
        </div>
        {ctaNode}
      </div>
    </section>
  )
}
