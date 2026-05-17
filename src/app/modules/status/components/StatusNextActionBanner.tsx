import { Link } from 'react-router-dom'
import type { HealthCheckResult } from '../api/health'
import {
  OVERALL_HEALTH_LABEL,
  summarizeOverallHealth,
  type OverallHealth,
} from '../statusLabels'
import { withStatusContext } from '../statusNav'

interface Props {
  configured: boolean
  authLoading: boolean
  profileLoadError: string | null
  checks: HealthCheckResult[]
  checking: boolean
  checkError: string | null
  search?: string | null
}

function nextActionForOverall(
  overall: OverallHealth,
  checks: HealthCheckResult[],
  configured: boolean,
  profileLoadError: string | null,
  checkError: string | null,
  search?: string | null,
): { tone: 'warn' | 'info' | 'ok'; title: string; detail: string; cta: { label: string; to: string } | null } {
  const to = (path: string) => withStatusContext(path, search)

  if (overall === 'checking') {
    return {
      tone: 'info',
      title: OVERALL_HEALTH_LABEL.checking,
      detail: 'กำลังตรวจแอป · โดเมน · Supabase และการเข้าสู่ระบบ',
      cta: null,
    }
  }

  if (checkError) {
    return {
      tone: 'warn',
      title: 'ตรวจสอบไม่สำเร็จ',
      detail: checkError,
      cta: { label: 'ลองอีกครั้ง', to: '#checks' },
    }
  }

  if (profileLoadError) {
    return {
      tone: 'warn',
      title: 'โหลดโปรไฟล์ไม่ครบ',
      detail: profileLoadError,
      cta: { label: 'ไปตั้งค่า', to: to('/app/settings') },
    }
  }

  const sessionFail = checks.find((c) => c.id === 'session')?.status === 'error'
  if (sessionFail) {
    return {
      tone: 'warn',
      title: 'ยังไม่ได้เข้าสู่ระบบ',
      detail: 'ออกจากระบบแล้วเข้าใหม่ หรือตรวจรหัสผ่าน',
      cta: { label: 'ไปเข้าสู่ระบบ', to: '/login' },
    }
  }

  const dbCheck = checks.find((c) => c.id === 'db')
  const hostCheck = checks.find((c) => c.id === 'host')

  if (!configured) {
    return {
      tone: 'info',
      title: 'โหมดพัฒนา',
      detail: 'ตั้ง VITE_SUPABASE_URL และ ANON_KEY ใน .env.local หรือ Vercel ก่อนขึ้น production',
      cta: { label: 'ศูนย์ Ops', to: to('/app/ops') },
    }
  }

  if (dbCheck?.status === 'error') {
    return {
      tone: 'warn',
      title: 'ฐานข้อมูลตอบผิดพลาด',
      detail: dbCheck.detail,
      cta: { label: 'ศูนย์ Ops', to: to('/app/ops') },
    }
  }

  if (hostCheck?.status === 'warn') {
    return {
      tone: 'warn',
      title: 'โดเมนไม่ตรง production',
      detail: hostCheck.detail,
      cta: { label: 'ดูเช็กลิสต์ deploy', to: to('/app/ops') },
    }
  }

  const profileWarn = checks.find((c) => c.id === 'profile')?.status === 'warn'
  if (profileWarn) {
    return {
      tone: 'warn',
      title: 'ยังไม่มีบทบาทในระบบ',
      detail: 'ติดต่อ CEO หรือ Operations เพื่อมอบสิทธิ์เข้าโมดูล',
      cta: { label: 'ช่วยเหลือ', to: to('/app/help#start') },
    }
  }

  if (overall === 'degraded') {
    const warnRow = checks.find((c) => c.status === 'warn')
    return {
      tone: 'warn',
      title: OVERALL_HEALTH_LABEL.degraded,
      detail: warnRow?.detail ?? 'มีรายการที่ควรตรวจเพิ่ม — ดูรายละเอียดด้านล่าง',
      cta: { label: 'ดูรายการตรวจ', to: '#checks' },
    }
  }

  return {
    tone: 'ok',
    title: OVERALL_HEALTH_LABEL.ok,
    detail: 'แอป · backend · การเข้าสู่ระบบพร้อมใช้งาน — รีเฟรชอัตโนมัติทุก 60 วินาที',
    cta: { label: 'เกี่ยวกับแอป', to: '#about' },
  }
}

export function StatusNextActionBanner({
  configured,
  authLoading,
  profileLoadError,
  checks,
  checking,
  checkError,
  search,
}: Props) {
  const overall = summarizeOverallHealth(checks, { checking, authLoading })
  const { tone, title, detail, cta } = nextActionForOverall(
    overall,
    checks,
    configured,
    profileLoadError,
    checkError,
    search,
  )

  if (!title) return null

  const className =
    tone === 'warn'
      ? 'crm-banner crm-banner--warn status-next-banner'
      : 'crm-banner status-next-banner'

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
      <div className="status-next-banner__inner">
        <div>
          <strong>{title}</strong>
          {detail ? <p className="muted status-next-banner__detail">{detail}</p> : null}
        </div>
        {ctaNode}
      </div>
    </section>
  )
}
