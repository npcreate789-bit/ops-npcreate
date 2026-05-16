import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { useScrollToHash } from '../../../hooks/useScrollToHash'
import { effectiveRolesForNav, sidebarNavItemsForRoles } from '../../../config/navigation'
import { canViewOpsCenter } from '../../../../shared/auth/access'
import { AboutInfoSection } from '../../about/components/AboutInfoSection'
import { runHealthChecks, type HealthCheckResult, type HealthStatus } from '../api/health'
import '../../../modules/crm/crm.css'
import '../../../modules/phase2/phase2.css'
import '../../about/about.css'
import '../status.css'

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok: 'ปกติ',
  warn: 'เตือน',
  error: 'ผิดพลาด',
  skip: 'ข้าม',
}

function authChecks(
  configured: boolean,
  loading: boolean,
  session: boolean,
  profile: boolean,
  profileLoadError: string | null,
): HealthCheckResult[] {
  const rows: HealthCheckResult[] = []

  if (!configured) {
    rows.push({
      id: 'auth-config',
      label: 'การยืนยันตัวตน',
      status: 'warn',
      detail: 'โหมดพัฒนา — ไม่ใช้ Supabase Auth',
    })
    return rows
  }

  if (loading) {
    rows.push({
      id: 'auth-loading',
      label: 'การยืนยันตัวตน',
      status: 'skip',
      detail: 'กำลังโหลดเซสชัน…',
    })
    return rows
  }

  rows.push({
    id: 'session',
    label: 'เซสชันเข้าสู่ระบบ',
    status: session ? 'ok' : 'error',
    detail: session ? 'มี session ที่ใช้งานได้' : 'ยังไม่ได้เข้าสู่ระบบ',
  })

  if (profileLoadError) {
    rows.push({
      id: 'profile',
      label: 'โปรไฟล์และบทบาท',
      status: 'error',
      detail: profileLoadError,
    })
  } else {
    rows.push({
      id: 'profile',
      label: 'โปรไฟล์และบทบาท',
      status: profile ? 'ok' : session ? 'warn' : 'skip',
      detail: profile ? 'โหลดโปรไฟล์สำเร็จ' : session ? 'ยังไม่มีบทบาทที่มอบหมาย' : '—',
    })
  }

  return rows
}

export function StatusPage() {
  useScrollToHash()
  const { configured, loading, session, profile, profileLoadError } = useAuth()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const [remoteChecks, setRemoteChecks] = useState<HealthCheckResult[]>([])
  const [checking, setChecking] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const moduleCount = sidebarNavItemsForRoles(navRoles).filter((i) => i.path !== '/app').length

  const runChecks = useCallback(async () => {
    setChecking(true)
    setCheckError(null)
    try {
      const results = await runHealthChecks()
      setRemoteChecks(results)
      setLastRun(new Date())
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : 'ตรวจสอบไม่สำเร็จ')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void runChecks()
  }, [runChecks])

  const authRows = authChecks(
    configured,
    loading,
    Boolean(session),
    Boolean(profile),
    profileLoadError,
  )
  const allChecks = [...authRows, ...remoteChecks]
  const hasError = allChecks.some((c) => c.status === 'error')
  const hasWarn = allChecks.some((c) => c.status === 'warn')

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>สถานะระบบ</h1>
          <p className="muted">เวอร์ชันแอป การเชื่อมต่อ backend และการเข้าสู่ระบบ</p>
        </div>
        <Link to="/app/help" className="crm-btn crm-btn--ghost">
          ช่วยเหลือ
        </Link>
      </header>

      <section id="about" className="card card--wide">
        <h2>เกี่ยวกับแอป</h2>
        <AboutInfoSection />
      </section>

      <section className="card card--wide">
        <div className="status-toolbar">
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            disabled={checking}
            onClick={() => void runChecks()}
          >
            {checking ? 'กำลังตรวจ…' : 'ตรวจสอบอีกครั้ง'}
          </button>
          <p className="status-summary" aria-live="polite">
            {lastRun
              ? `ตรวจล่าสุด ${lastRun.toLocaleTimeString('th-TH')}`
              : 'ยังไม่ได้ตรวจ'}
            {' · '}
            เมนูงาน {moduleCount} รายการ
            {hasError ? ' · พบข้อผิดพลาด' : hasWarn ? ' · มีคำเตือน' : allChecks.length ? ' · โดยรวมปกติ' : ''}
          </p>
        </div>

        {checkError && (
          <p className="crm-error" role="alert">
            {checkError}
          </p>
        )}

        <ul className="status-list">
          {allChecks.map((row) => (
            <li key={row.id} className="status-row">
              <span className={`status-badge status-badge--${row.status}`}>
                {STATUS_LABEL[row.status]}
              </span>
              <div>
                <p className="status-row__label">{row.label}</p>
                <p className="status-row__detail">{row.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card card--wide">
        <h2>คำแนะนำ</h2>
        <ul className="flow-list">
          <li>หากฐานข้อมูลผิดพลาด ลองรีเฟรชหรือตรวจ RLS / migration บน Supabase</li>
          <li>
            เช็กลิสต์เริ่มต้นอยู่ที่ <Link to="/app/help#start">ช่วยเหลือ → เริ่มใช้งาน</Link>
          </li>
          {canViewOpsCenter(navRoles) && (
            <li>
              ทีม Ops ใช้ <Link to="/app/ops">ศูนย์ Ops</Link> สำหรับเช็กลิสต์ deploy
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}
