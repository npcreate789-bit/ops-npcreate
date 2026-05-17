import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { useScrollToHash } from '../../../hooks/useScrollToHash'
import { effectiveRolesForNav, sidebarNavItemsForRoles } from '../../../config/navigation'
import { AboutInfoSection } from '../../about/components/AboutInfoSection'
import { authHealthChecks } from '../api/authHealth'
import { runHealthChecks, type HealthCheckResult } from '../api/health'
import {
  canAccessStatusPage,
  statusRelatedLinksForRoles,
} from '../access'
import { StatusNextActionBanner } from '../components/StatusNextActionBanner'
import { StatusRelatedToolbar } from '../components/StatusRelatedToolbar'
import { StatusRoleGuide } from '../components/StatusRoleGuide'
import {
  labelHealthStatus,
  labelLastChecked,
  labelModuleMenuCount,
  OVERALL_HEALTH_LABEL,
  summarizeOverallHealth,
} from '../statusLabels'
import { withStatusContext } from '../statusNav'
import '../../../modules/crm/crm.css'
import '../../../modules/phase2/phase2.css'
import '../../about/about.css'
import '../status.css'

const AUTO_REFRESH_MS = 60_000

export function StatusPage() {
  useScrollToHash()
  const location = useLocation()
  const { configured, loading, session, profile, profileLoadError } = useAuth()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const search = location.search
  const allowed = canAccessStatusPage(roles, configured)
  const relatedLinks = statusRelatedLinksForRoles(roles, configured)

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

  const authLoading = configured && loading
  const authRows = authHealthChecks(
    configured,
    authLoading,
    Boolean(session),
    Boolean(profile),
    profileLoadError,
  )
  const allChecks = [...authRows, ...remoteChecks]
  const overall = summarizeOverallHealth(allChecks, {
    checking: checking && !lastRun,
    authLoading,
  })

  useEffect(() => {
    if (authLoading) return
    void runChecks()
  }, [runChecks, authLoading, configured])

  useEffect(() => {
    if (authLoading || !allowed) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runChecks()
      }
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [runChecks, authLoading, allowed])

  if (configured && !loading && !allowed) {
    return (
      <div className="page">
        <header className="page__header phase2-page__header">
          <h1>สถานะระบบ</h1>
          <p className="crm-error">ไม่มีสิทธิ์ดูสถานะระบบ — สำหรับทีมภายในเท่านั้น</p>
          <p className="muted">
            ลูกค้าใช้ <Link to={withStatusContext('/app/client', search)}>พื้นที่ลูกค้า</Link>
            {' · '}
            <Link to={withStatusContext('/app/help', search)}>ช่วยเหลือ</Link>
          </p>
        </header>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="page">
        <header className="page__header phase2-page__header">
          <h1>สถานะระบบ</h1>
          <p className="muted">กำลังโหลดเซสชัน…</p>
        </header>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>สถานะระบบ</h1>
          <p className="muted">ตรวจแอป · backend · การเข้าสู่ระบบ — รีเฟรชอัตโนมัติทุก 60 วินาที</p>
        </div>
        <Link to={withStatusContext('/app/help', search)} className="crm-btn crm-btn--ghost">
          ช่วยเหลือ
        </Link>
      </header>

      <StatusNextActionBanner
        configured={configured}
        authLoading={authLoading}
        profileLoadError={profileLoadError}
        checks={allChecks}
        checking={checking && !lastRun}
        checkError={checkError}
        search={search}
      />

      <StatusRoleGuide roles={roles} configured={configured} search={search} />

      <section id="about" className="card card--wide">
        <h2>เกี่ยวกับแอป</h2>
        <AboutInfoSection />
      </section>

      <section id="checks" className="card card--wide">
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
            <span
              className={`status-overall status-overall--${overall}`}
              aria-label={OVERALL_HEALTH_LABEL[overall]}
            >
              {OVERALL_HEALTH_LABEL[overall]}
            </span>
            {' · '}
            {labelLastChecked(lastRun)}
            {' · '}
            {labelModuleMenuCount(moduleCount)}
          </p>
        </div>

        {checkError && (
          <p className="crm-error" role="alert">
            {checkError}
          </p>
        )}

        {allChecks.length === 0 && !checking && (
          <p className="muted">ยังไม่มีผลตรวจ — กดปุ่มตรวจสอบอีกครั้ง</p>
        )}

        <ul className="status-list">
          {allChecks.map((row) => (
            <li key={row.id} className="status-row">
              <span className={`status-badge status-badge--${row.status}`}>
                {labelHealthStatus(row.status)}
              </span>
              <div>
                <p className="status-row__label">{row.label}</p>
                <p className="status-row__detail">{row.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <StatusRelatedToolbar links={relatedLinks} search={search} />
    </div>
  )
}
