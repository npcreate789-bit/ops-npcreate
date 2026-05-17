import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { effectiveRolesForNav, navItemsForRoles } from '../../../config/navigation'
import { APP_VERSION } from '../../about/appMeta'
import { runHealthChecks, type HealthCheckResult } from '../../status/api/health'
import { OpsNextActionBanner } from '../components/OpsNextActionBanner'
import { OpsRelatedToolbar } from '../components/OpsRelatedToolbar'
import { OpsRoleGuide } from '../components/OpsRoleGuide'
import {
  canShowOpsActivityLink,
  canShowOpsNavLink,
  canShowOpsQuickSearch,
  canViewOpsCenter,
  opsChecklistStatus,
  opsRelatedLinksForRoles,
  type OpsChecklistKey,
} from '../access'
import {
  labelBackendConnection,
  labelModuleAccess,
  labelQuickSearch,
  OPS_CHECKLIST_STATUS_LABEL,
  OPS_CHECKLIST_STATUS_SYMBOL,
} from '../opsLabels'
import { withOpsContext } from '../opsNav'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../ops.css'

const CHECKLIST: {
  key: OpsChecklistKey
  title: string
  detail: string
  cmd: string
}[] = [
  {
    key: 'env',
    title: 'ตั้งค่า Supabase',
    detail: 'ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local',
    cmd: 'npm run setup:step1',
  },
  {
    key: 'migrate',
    title: 'รัน migrations',
    detail: 'ครบ 00001–00036 บน staging ก่อน production',
    cmd: 'npm run db:sql:phase4-7',
  },
  {
    key: 'build',
    title: 'Build production',
    detail: 'ตรวจ TypeScript + Vite ก่อน deploy',
    cmd: 'npm run build',
  },
  {
    key: 'deploy',
    title: 'Deploy SPA',
    detail: 'Vercel — vercel.json มี SPA rewrite แล้ว',
    cmd: 'vercel deploy --prod',
  },
]

export function OpsCenterPage() {
  const { profile, configured } = useAuth()
  const location = useLocation()
  const roles = profile?.roles ?? []
  const navRoles = effectiveRolesForNav(roles, configured)
  const allowed = canViewOpsCenter(navRoles) || !configured
  const showSearch = canShowOpsQuickSearch(navRoles) || !configured
  const visibleNav = navItemsForRoles(navRoles)
  const moduleCount = visibleNav.filter((i) => i.ready && i.path !== '/app').length
  const relatedLinks = opsRelatedLinksForRoles(roles, configured)
  const search = location.search

  const showDashboard = canShowOpsNavLink(navRoles, '/app/dashboard') || !configured
  const showActivity = canShowOpsActivityLink(navRoles) || !configured
  const showSettings = canShowOpsNavLink(navRoles, '/app/settings') || !configured
  const showStatus = canShowOpsNavLink(navRoles, '/app/status') || !configured

  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([])
  const [healthLoading, setHealthLoading] = useState(true)

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const results = await runHealthChecks()
      setHealthChecks(results)
    } catch {
      setHealthChecks([])
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHealth()
  }, [loadHealth, configured])

  if (!allowed) {
    return (
      <div className="page">
        <h1>ศูนย์ Ops</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูศูนย์ Ops — เฉพาะ CEO, Operations, Dev</p>
        <p className="muted">
          ต้องการดูสถานะทั่วไป? ไปที่{' '}
          <Link to="/app/status">สถานะระบบ</Link> หรือ <Link to="/app/help">ช่วยเหลือ</Link>
        </p>
      </div>
    )
  }

  const dbOk = healthChecks.find((c) => c.id === 'db')?.status === 'ok'

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ศูนย์ Ops</h1>
          <p className="muted">
            ความพร้อม deploy และเช็กลิสต์ก่อนขึ้น production · เวอร์ชัน {APP_VERSION}
          </p>
        </div>
        <div className="ops-header__actions">
          {showStatus && (
            <Link to={withOpsContext('/app/status', search)} className="crm-btn crm-btn--ghost">
              สถานะระบบ
            </Link>
          )}
          <Link to={withOpsContext('/app', search)} className="crm-btn crm-btn--ghost">
            หน้าหลัก
          </Link>
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ยังไม่เชื่อม Supabase</p>
      )}

      <OpsNextActionBanner
        configured={configured}
        healthChecks={healthChecks}
        healthLoading={healthLoading}
        search={search}
      />

      <section className="card-grid">
        <article className="card card--accent">
          <h2>Backend</h2>
          <p className="stat">{labelBackendConnection(configured)}</p>
          <span className="muted">
            {healthLoading
              ? 'กำลังตรวจ…'
              : configured && dbOk
                ? 'Supabase + RLS ตอบสนองได้'
                : 'Supabase + RLS'}
          </span>
        </article>
        <article className="card">
          <h2>โมดูลที่เข้าถึงได้</h2>
          <p className="stat">{labelModuleAccess(moduleCount)}</p>
          <span className="muted">ตามบทบาทของคุณ</span>
        </article>
        <article className="card">
          <h2>ค้นหาด่วน</h2>
          <p className="stat">{labelQuickSearch(showSearch)}</p>
          <span className="muted">
            {showSearch ? 'กด ⌘K จากทุกหน้า' : 'ไม่มีสิทธิ์ใช้ค้นหารวม'}
          </span>
        </article>
      </section>

      <OpsRoleGuide search={search} />

      <section className="card card--wide">
        <h2>เช็กลิสต์ก่อน deploy</h2>
        <p className="muted ops-checklist__intro">
          {OPS_CHECKLIST_STATUS_SYMBOL.ok} {OPS_CHECKLIST_STATUS_LABEL.ok} ·{' '}
          {OPS_CHECKLIST_STATUS_SYMBOL.warn} {OPS_CHECKLIST_STATUS_LABEL.warn} ·{' '}
          {OPS_CHECKLIST_STATUS_SYMBOL.manual} {OPS_CHECKLIST_STATUS_LABEL.manual}
        </p>
        <ul className="ops-checklist">
          {CHECKLIST.map((item) => {
            const status = opsChecklistStatus(item.key, configured)
            return (
              <li key={item.key}>
                <span
                  className={`ops-checklist__status ops-checklist__status--${status}`}
                  title={OPS_CHECKLIST_STATUS_LABEL[status]}
                >
                  <span aria-hidden>{OPS_CHECKLIST_STATUS_SYMBOL[status]}</span>
                  <span className="ops-checklist__status-text">
                    {OPS_CHECKLIST_STATUS_LABEL[status]}
                  </span>
                </span>
                <div className="ops-checklist__body">
                  <strong>{item.title}</strong>
                  <span className="muted">{item.detail}</span>
                  <br />
                  <code>{item.cmd}</code>
                </div>
              </li>
            )
          })}
        </ul>
        <div className="ops-links">
          {showDashboard && (
            <Link
              to={withOpsContext('/app/dashboard', search)}
              className="crm-btn crm-btn--ghost"
            >
              ภาพรวมผู้บริหาร
            </Link>
          )}
          {showActivity && (
            <Link
              to={withOpsContext('/app/activity', search)}
              className="crm-btn crm-btn--ghost"
            >
              บันทึกกิจกรรม
            </Link>
          )}
          {showSearch && (
            <Link to={withOpsContext('/app/search', search)} className="crm-btn crm-btn--ghost">
              ค้นหารวม
            </Link>
          )}
          {showSettings && (
            <Link
              to={withOpsContext('/app/settings', search)}
              className="crm-btn crm-btn--ghost"
            >
              ตั้งค่าบัญชี
            </Link>
          )}
        </div>
      </section>

      <OpsRelatedToolbar links={relatedLinks} search={search} />

      <section id="ops-env" className="card card--wide">
        <h2>ตัวแปรสภาพแวดล้อม (Vercel)</h2>
        <p className="muted">ตั้งค่าใน Project Settings → Environment Variables</p>
        <ul className="flow-list">
          <li>
            <code>VITE_SUPABASE_URL</code>
          </li>
          <li>
            <code>VITE_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
        {profile?.email && (
          <p className="muted" style={{ marginTop: '1rem' }}>
            ผู้ดูแล: {profile.email}
          </p>
        )}
      </section>
    </div>
  )
}
