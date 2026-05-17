import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canViewReportFinanceMetrics,
  canViewReports,
  canViewWeeklyReport,
} from '../../../../shared/auth/access'
import { bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import { downloadCsv } from '../../../../shared/export/csv'
import { buildReportInsights } from '../api/insights'
import { fetchAdvancedReport } from '../api/reports'
import { ReportsFocusFilterBar } from '../components/ReportsFocusFilterBar'
import { ReportsRoleGuide } from '../components/ReportsRoleGuide'
import { matchesReportsFocus, type ReportsFocusFilter } from '../pipeline'
import type { AdvancedReport } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../reports.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function monthLabel(prefix: string): string {
  const [y, m] = prefix.split('-')
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(`${y}-${m}-15T12:00:00+07:00`))
}

function StatCard({
  to,
  label,
  value,
  meta,
}: {
  to: string
  label: string
  value: string
  meta?: string
}) {
  return (
    <Link to={to} className="report-stat report-stat--link">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
      {meta ? <small className="muted">{meta}</small> : null}
    </Link>
  )
}

export function ReportsPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewReports(roles) || !configured
  const showFinance = canViewReportFinanceMetrics(roles) || !configured
  const showWeekly = canViewWeeklyReport(roles) || !configured

  const [month, setMonth] = useState(() => bangkokYearMonthPrefix())
  const [report, setReport] = useState<AdvancedReport | null>(null)
  const [focusFilter, setFocusFilter] = useState<ReportsFocusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!allowed) return
    setLoading(true)
    setError(null)
    try {
      setReport(await fetchAdvancedReport(month))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [month, allowed])

  useEffect(() => {
    void load()
  }, [load])

  const insights = useMemo(() => {
    if (!report) return []
    return buildReportInsights(report, roles).filter((item) => {
      if (!showFinance && item.focus === 'finance') return false
      return matchesReportsFocus(item, focusFilter)
    })
  }, [report, roles, showFinance, focusFilter])

  const focusCounts = useMemo(() => {
    if (!report) return {}
    const all = buildReportInsights(report, roles).filter(
      (item) => showFinance || item.focus !== 'finance',
    )
    const counts: Partial<Record<ReportsFocusFilter, number>> = {
      all: all.length,
      finance: 0,
      ads: 0,
      operations: 0,
    }
    for (const item of all) {
      if (item.focus === 'finance') counts.finance = (counts.finance ?? 0) + 1
      if (item.focus === 'ads') counts.ads = (counts.ads ?? 0) + 1
      if (item.focus === 'operations') counts.operations = (counts.operations ?? 0) + 1
    }
    return counts
  }, [report, roles, showFinance])

  if (!allowed) {
    return (
      <div className="page">
        <h1>รายงานขั้นสูง</h1>
        <p className="crm-error">ไม่มีสิทธิ์เข้าถึงรายงานนี้</p>
      </div>
    )
  }

  return (
    <div className="page reports-page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>รายงานขั้นสูง</h1>
          <p className="muted">
            สรุปรายเดือนทั้งองค์กรจากข้อมูลจริงในระบบ · คลิกตัวเลขเพื่อเปิดโมดูลที่เกี่ยวข้อง
          </p>
        </div>
        <div className="reports-page__header-actions">
          <Link to="/app/dashboard" className="crm-btn crm-btn--ghost">
            แดชบอร์ด
          </Link>
          {showWeekly && (
            <Link to="/app/weekly" className="crm-btn crm-btn--ghost">
              สรุปรายสัปดาห์
            </Link>
          )}
          <Link to="/app/customers" className="crm-btn crm-btn--ghost">
            ลูกค้า 360°
          </Link>
          <Link to="/app/client/reports" className="crm-btn crm-btn--ghost">
            รายงานลูกค้า
          </Link>
          {report && (
            <button
              type="button"
              className="crm-btn crm-btn--ghost"
              onClick={() => {
                const r = report
                const rows: (string | number)[][] = [
                  ['ลูกค้า Active', r.active_customers],
                  ['สัญญาหมด 30 วัน', r.contracts_expiring_30d],
                  ['Spend แอด', r.ads_spend],
                  ['GMV แอด', r.ads_gmv],
                  ['ROI เฉลี่ย', r.ads_avg_roi ?? ''],
                  ['คอนเทนต์ส่งมอบ', r.content_delivered],
                  ['งานเปิด', r.open_tasks],
                ]
                if (showFinance) {
                  rows.unshift(
                    ['รายรับเดือน', r.revenue_paid],
                    ['ลูกหนี้ค้าง', r.pending_receivables],
                  )
                }
                downloadCsv(`report-${month}`, ['รายการ', 'ค่า'], rows)
              }}
            >
              ส่งออก CSV
            </button>
          )}
          <label className="task-field">
            <span className="task-field__label">เดือน</span>
            <input
              type="month"
              className="crm-input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        </div>
      </header>

      <ReportsRoleGuide />

      {showWeekly && (
        <div className="reports-hint-banner">
          <p>ต้องการตัวเลขช่วง 7 วันล่าสุดแทนรายเดือน?</p>
          <Link to="/app/weekly" className="crm-btn crm-btn--ghost">
            ไปสรุปรายสัปดาห์
          </Link>
        </div>
      )}

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ตัวเลขเป็นตัวอย่าง</p>
      )}

      {error && <p className="crm-error">{error}</p>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      {!loading && report && (
        <>
          {showFinance && (
            <section className="card card--wide">
              <div className="reports-section-head">
                <h2>การเงิน · {monthLabel(report.month)}</h2>
                <Link to="/app/finance" className="crm-btn crm-btn--ghost">
                  เปิดการเงิน
                </Link>
              </div>
              <div className="report-stat-grid">
                <StatCard
                  to="/app/finance"
                  label="รายรับ (ชำระแล้ว)"
                  value={formatMoney(report.revenue_paid)}
                  meta={`${report.payments_paid_count} รายการ`}
                />
                <StatCard
                  to="/app/finance"
                  label="ลูกหนี้ค้าง"
                  value={formatMoney(report.pending_receivables)}
                  meta="รอชำระ + เกินกำหนด"
                />
              </div>
            </section>
          )}

          <section className="card card--wide">
            <div className="reports-section-head">
              <h2>ลูกค้าและสัญญา</h2>
              <Link to="/app/renewals" className="crm-btn crm-btn--ghost">
                ต่อสัญญา
              </Link>
            </div>
            <div className="report-stat-grid">
              <StatCard
                to="/app/customers"
                label="ลูกค้า Active"
                value={String(report.active_customers)}
              />
              <StatCard
                to="/app/renewals"
                label="สัญญาหมดใน 30 วัน"
                value={String(report.contracts_expiring_30d)}
                meta="ควรเปิดเคสต่อสัญญา"
              />
            </div>
          </section>

          <section className="card card--wide">
            <div className="reports-section-head">
              <h2>ยิงแอด · คอนเทนต์ · งานภายใน</h2>
              <div className="reports-section-head__links">
                <Link to="/app/ads" className="crm-btn crm-btn--ghost">
                  งานยิงแอด
                </Link>
                <Link to="/app/content" className="crm-btn crm-btn--ghost">
                  คอนเทนต์
                </Link>
                <Link to="/app/tasks" className="crm-btn crm-btn--ghost">
                  งานภายใน
                </Link>
              </div>
            </div>
            <div className="report-stat-grid">
              <StatCard
                to="/app/ads"
                label="Spend แอด"
                value={formatMoney(report.ads_spend)}
                meta="จากรายงานรายวัน"
              />
              <StatCard
                to="/app/ads"
                label="GMV แอด"
                value={formatMoney(report.ads_gmv)}
              />
              <StatCard
                to="/app/ads"
                label="ROI เฉลี่ย"
                value={
                  report.ads_avg_roi != null ? report.ads_avg_roi.toFixed(2) : '—'
                }
                meta={report.ads_spend > 0 ? 'เดือนนี้' : 'ยังไม่มี spend'}
              />
              <StatCard
                to="/app/content"
                label="คอนเทนต์ส่งมอบ"
                value={String(report.content_delivered)}
                meta="สถานะ delivered"
              />
              <StatCard
                to="/app/tasks"
                label="งานเปิดอยู่"
                value={String(report.open_tasks)}
                meta="ยังไม่ done"
              />
            </div>
          </section>

          <section className="card card--wide">
            <h2>คำแนะนำอัตโนมัติ</h2>
            <p className="muted reports-insights-intro">
              วิเคราะห์จากกฎธุรกิจ — กรองตามหมวดแล้วกด「ไปจัดการ」
            </p>
            <ReportsFocusFilterBar
              active={focusFilter}
              onSelect={setFocusFilter}
              counts={focusCounts}
            />
            {insights.length === 0 ? (
              <p className="muted">ไม่มีคำแนะนำในหมวดนี้สำหรับเดือนที่เลือก</p>
            ) : (
              <ul className="report-insights">
                {insights.map((item) => (
                  <li
                    key={item.id}
                    className={`report-insight report-insight--${item.severity}`}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    {item.link && (
                      <Link to={item.link} className="crm-btn crm-btn--ghost">
                        ไปจัดการ
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
