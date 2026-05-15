import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { navItemsForRoles } from '../../../config/navigation'
import {
  canShowOpsActivityLink,
  canShowOpsNavLink,
  canShowOpsQuickSearch,
  canViewOpsCenter,
  opsChecklistStatus,
} from '../access'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../ops.css'

const CHECKLIST = [
  {
    key: 'env' as const,
    title: 'ตั้งค่า Supabase',
    detail: 'ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env.local',
    cmd: 'npm run setup:step1',
  },
  {
    key: 'migrate' as const,
    title: 'รัน migrations',
    detail: 'ครบ 00001–00036 บน staging ก่อน production',
    cmd: 'npm run db:sql:phase4-7',
  },
  {
    key: 'build' as const,
    title: 'Build production',
    detail: 'ตรวจ TypeScript + Vite ก่อน deploy',
    cmd: 'npm run build',
  },
  {
    key: 'deploy' as const,
    title: 'Deploy SPA',
    detail: 'Vercel — vercel.json มี SPA rewrite แล้ว',
    cmd: 'vercel deploy --prod',
  },
]

const CHECKLIST_STATUS_LABEL = {
  ok: '✓',
  warn: '○',
  manual: '—',
} as const

export function OpsCenterPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewOpsCenter(roles) || !configured
  const showSearch = canShowOpsQuickSearch(roles) || !configured
  const visibleNav = navItemsForRoles(roles)
  const moduleCount = visibleNav.filter((i) => i.ready && i.path !== '/app').length
  const showDashboard = canShowOpsNavLink(roles, '/app/dashboard') || !configured
  const showActivity = canShowOpsActivityLink(roles) || !configured
  const showSettings = canShowOpsNavLink(roles, '/app/settings') || !configured

  if (!allowed) {
    return (
      <div className="page">
        <h1>ศูนย์ Ops</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูศูนย์ Ops — เฉพาะ CEO, Operations, Dev</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ศูนย์ Ops</h1>
          <p className="muted">ความพร้อม deploy และเช็กลิสต์ก่อนขึ้น production</p>
        </div>
        <Link to="/app" className="crm-btn crm-btn--ghost">
          หน้าหลัก
        </Link>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ยังไม่เชื่อม Supabase</p>
      )}

      <section className="card-grid">
        <article className="card card--accent">
          <h2>Backend</h2>
          <p className="stat">{configured ? 'เชื่อมแล้ว' : 'ยังไม่ตั้งค่า'}</p>
          <span className="muted">Supabase + RLS</span>
        </article>
        <article className="card">
          <h2>โมดูลที่เข้าถึงได้</h2>
          <p className="stat">{moduleCount}</p>
          <span className="muted">ตามบทบาทของคุณ</span>
        </article>
        <article className="card">
          <h2>ค้นหาด่วน</h2>
          <p className="stat">{showSearch ? '⌘K' : '—'}</p>
          <span className="muted">
            {showSearch ? 'Command palette ทุกหน้า' : 'ไม่มีสิทธิ์'}
          </span>
        </article>
      </section>

      <section className="card card--wide">
        <h2>เช็กลิสต์ก่อน deploy</h2>
        <p className="muted ops-checklist__intro">
          ✓ ตรวจอัตโนมัติ · ○ ยังไม่ครบ · — ตรวจด้วยตนเองก่อน deploy
        </p>
        <ul className="ops-checklist">
          {CHECKLIST.map((item) => {
            const status = opsChecklistStatus(item.key, configured)
            return (
              <li key={item.key}>
                <span
                  className={`ops-checklist__status ops-checklist__status--${status}`}
                  aria-hidden
                >
                  {CHECKLIST_STATUS_LABEL[status]}
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
            <Link to="/app/dashboard" className="crm-btn crm-btn--ghost">
              ภาพรวมผู้บริหาร
            </Link>
          )}
          {showActivity && (
            <Link to="/app/activity" className="crm-btn crm-btn--ghost">
              บันทึกกิจกรรม
            </Link>
          )}
          {showSearch && (
            <Link to="/app/search" className="crm-btn crm-btn--ghost">
              ค้นหารวม
            </Link>
          )}
          {showSettings && (
            <Link to="/app/settings" className="crm-btn crm-btn--ghost">
              ตั้งค่าบัญชี
            </Link>
          )}
        </div>
      </section>

      <section className="card card--wide">
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
