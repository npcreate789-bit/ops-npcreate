import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canViewActivityLog,
  canViewWeeklyReport,
} from '../../../../shared/auth/access'
import { bangkokTodayIsoDate } from '../../../../shared/dates/bangkok'
import { fetchExecutiveDashboard } from '../api/dashboard'
import type { ExecutiveDashboard } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../dashboard.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function DashboardPage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const showWeekly = canViewWeeklyReport(roles) || !configured
  const showActivity = canViewActivityLog(roles) || !configured
  const today = bangkokTodayIsoDate()

  const [data, setData] = useState<ExecutiveDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchExecutiveDashboard(userId, roles)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId, roles])

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลดภาพรวม...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <p className="crm-error">{error ?? 'ไม่สามารถโหลดข้อมูลได้'}</p>
      </div>
    )
  }

  const { finance, leads, customers, ads, tasks, content, alerts } = data
  const adsReportPct =
    ads.reports_expected > 0
      ? Math.round((ads.reports_submitted / ads.reports_expected) * 100)
      : 0

  return (
    <div className="page">
      <header className="page__header">
        <h1>ภาพรวมผู้บริหาร</h1>
        <p>
          รายได้ ลูกค้า Pipeline แอด และงานที่ต้องติดตาม — ข้อมูล ณ วันที่ {today}
        </p>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลจาก localStorage
        </p>
      )}

      {error && <p className="crm-error">{error}</p>}

      {alerts.length > 0 && (
        <section className="card card--wide">
          <h2 className="dashboard-section-title">ต้องดำเนินการ</h2>
          <ul className="dashboard-alerts">
            {alerts.map((a) => (
              <li key={a.id} className={`dashboard-alert dashboard-alert--${a.severity}`}>
                <span>{a.message}</span>
                <Link to={a.link}>ดู →</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card-grid">
        <article className="card card--accent">
          <h2>รายรับเดือนนี้</h2>
          <p className="stat">{formatMoney(finance.revenue_this_month)}</p>
          <span className="muted">บาท · {finance.paid_count_this_month} รายการ</span>
        </article>
        <article className="card">
          <h2>ลูกหนี้ค้าง</h2>
          <p className="stat">{formatMoney(finance.pending_total)}</p>
          <span className="muted">บาท</span>
        </article>
        <article className="card">
          <h2>ลูกค้า Active</h2>
          <p className="stat">{customers.active}</p>
          <span className="muted">ราย · พร้อมยิงแอด {customers.ready_for_ads}</span>
        </article>
        <article className="card">
          <h2>Lead Pipeline</h2>
          <p className="stat">{leads.pipeline}</p>
          <span className="muted">จากทั้งหมด {leads.total} · ปิดแล้ว {leads.won}</span>
        </article>
      </section>

      <section className="card-grid">
        <article className="card">
          <h2>แอดวันนี้ — Spend</h2>
          <p className="stat">{formatMoney(ads.spend_today)}</p>
          <span className="muted">บาท</span>
        </article>
        <article className="card">
          <h2>แอดวันนี้ — GMV</h2>
          <p className="stat">{formatMoney(ads.gmv_today)}</p>
          <span className="muted">
            ROI เฉลี่ย {ads.avg_roi != null ? ads.avg_roi.toFixed(2) : '—'}
          </span>
        </article>
        <article className="card">
          <h2>รายงานแอดวันนี้</h2>
          <p className="stat">{adsReportPct}%</p>
          <span className="muted">
            {ads.reports_submitted}/{ads.reports_expected} แบรนด์
          </span>
        </article>
        <article className="card">
          <h2>งานภายใน</h2>
          <p className="stat">{tasks.open_count}</p>
          <span className="muted">
            เปิดอยู่ · ติดขัด {tasks.blocked_count} · เกินกำหนด {tasks.overdue_count}
          </span>
        </article>
        <article className="card">
          <h2>งานคอนเทนต์</h2>
          <p className="stat">{content.in_production_count}</p>
          <span className="muted">
            กำลังผลิต · รอตรวจ {content.review_count} · เกินกำหนด {content.overdue_count}
          </span>
        </article>
      </section>

      <section className="card card--wide">
        <h2 className="dashboard-section-title">ทางลัด</h2>
        <div className="dashboard-links">
          <Link to="/app/finance">การเงิน</Link>
          <Link to="/app/crm">CRM</Link>
          <Link to="/app/sales">ขาย</Link>
          <Link to="/app/onboarding">รับบรีฟ</Link>
          <Link to="/app/ads">งานยิงแอด</Link>
          <Link to="/app/tasks">งานภายใน</Link>
          <Link to="/app/content">งานคอนเทนต์</Link>
          <Link to="/app/admin">จัดการผู้ใช้</Link>
          <Link to="/app/client">รายงานลูกค้า</Link>
          {showWeekly && <Link to="/app/weekly">สรุปรายสัปดาห์</Link>}
          {showActivity && <Link to="/app/activity">บันทึกกิจกรรม</Link>}
          <Link to="/app/reports">รายงานขั้นสูง</Link>
          <Link to="/app/timeline">ไทม์ไลน์งาน</Link>
        </div>
      </section>
    </div>
  )
}
