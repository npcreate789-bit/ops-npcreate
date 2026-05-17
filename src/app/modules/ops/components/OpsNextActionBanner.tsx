import { Link } from 'react-router-dom'
import type { HealthCheckResult } from '../../status/api/health'
import { withOpsContext } from '../opsNav'

interface Props {
  configured: boolean
  healthChecks: HealthCheckResult[]
  healthLoading: boolean
  search?: string | null
}

export function OpsNextActionBanner({
  configured,
  healthChecks,
  healthLoading,
  search,
}: Props) {
  if (healthLoading) return null

  let tone: 'warn' | 'info' | 'ok' = 'info'
  let title = ''
  let detail = ''
  let cta: { label: string; to: string } | null = null

  const dbCheck = healthChecks.find((c) => c.id === 'db')
  const hostCheck = healthChecks.find((c) => c.id === 'host')
  const hasDbError = dbCheck?.status === 'error'
  const hasHostWarn = hostCheck?.status === 'warn'

  if (!configured) {
    tone = 'warn'
    title = 'ตั้งค่า Supabase ก่อน deploy'
    detail = 'ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local หรือ Vercel'
    cta = { label: 'ดูตัวแปรด้านล่าง', to: '#ops-env' }
  } else if (hasDbError) {
    tone = 'warn'
    title = 'ฐานข้อมูลตอบผิดพลาด'
    detail = dbCheck?.detail ?? 'ตรวจ RLS และ migration บน Supabase'
    cta = {
      label: 'ไปสถานะระบบ',
      to: withOpsContext('/app/status', search),
    }
  } else if (hasHostWarn) {
    tone = 'warn'
    title = 'โดเมนไม่ตรง production'
    detail = hostCheck?.detail ?? 'ตรวจว่า deploy ไปโดเมนหลักของแอป'
    cta = {
      label: 'ตรวจสถานะระบบ',
      to: withOpsContext('/app/status', search),
    }
  } else if (configured) {
    tone = 'ok'
    title = 'Backend พร้อม — ตรวจเช็กลิสต์ deploy'
    detail = 'รัน migration · build · deploy ตามรายการด้านล่างก่อนขึ้น production'
    cta = {
      label: 'ดูเวอร์ชันแอป',
      to: withOpsContext('/app/about', search),
    }
  }

  if (!title) return null

  const className =
    tone === 'warn'
      ? 'crm-banner crm-banner--warn ops-next-banner'
      : tone === 'ok'
        ? 'crm-banner ops-next-banner'
        : 'crm-banner ops-next-banner'

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
      <div className="ops-next-banner__inner">
        <div>
          <strong>{title}</strong>
          {detail ? <p className="muted ops-next-banner__detail">{detail}</p> : null}
        </div>
        {ctaNode}
      </div>
    </section>
  )
}
