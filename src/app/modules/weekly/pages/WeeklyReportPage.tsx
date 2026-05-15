import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewReportFinanceMetrics, canViewWeeklyReport } from '../../../../shared/auth/access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { downloadCsv } from '../../../../shared/export/csv'
import {
  canViewWeeklyAdsMetrics,
  canViewWeeklyLeadMetrics,
  isWeeklyReportScoped,
  weeklyMetricKeysForRoles,
} from '../access'
import { buildWeeklyInsights } from '../api/insights'
import { currentWeekRange, fetchWeeklyReport } from '../api/weeklyReport'
import type { WeeklyReport } from '../types'
import type { ReportInsight } from '../../reports/types'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../../reports/reports.css'
import '../weekly.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function WeeklyReportPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewWeeklyReport(roles) || !configured
  const showFinance = canViewReportFinanceMetrics(roles) || !configured
  const showAds = canViewWeeklyAdsMetrics(roles) || !configured
  const showLeads = canViewWeeklyLeadMetrics(roles) || !configured
  const scoped = isWeeklyReportScoped(roles) && configured
  const metricKeys = useMemo(() => weeklyMetricKeysForRoles(roles), [roles])

  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [insights, setInsights] = useState<ReportInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!allowed) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWeeklyReport()
      setReport(data)
      setInsights(buildWeeklyInsights(data, roles))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [allowed, roles])

  useEffect(() => {
    void load()
  }, [load])

  if (!allowed) {
    return (
      <div className="page">
        <h1>สรุปรายสัปดาห์</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูรายงานสัปดาห์</p>
      </div>
    )
  }

  const range = report ?? currentWeekRange()

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>สรุปรายสัปดาห์</h1>
          <p className="muted weekly-range">
            {formatBangkokDate(range.week_start)} – {formatBangkokDate(range.week_end)}
            {' · '}
            ข้อมูลจากระบบ (ไม่ใช้ AI ภายนอก)
          </p>
        </div>
        <div className="crm-page__actions">
          {report && (
            <button
              type="button"
              className="crm-btn crm-btn--ghost"
              onClick={() => {
                const r = report!
                const rows: (string | number)[][] = []
                if (showFinance && metricKeys.includes('finance')) {
                  rows.push(
                    ['รายรับสัปดาห์', r.revenue_paid],
                    ['รายการชำระ', r.payments_paid_count],
                  )
                }
                if (showAds && metricKeys.includes('ads')) {
                  rows.push(
                    ['Spend แอด', r.ads_spend],
                    ['GMV แอด', r.ads_gmv],
                    ['ROI เฉลี่ย', r.ads_avg_roi ?? ''],
                  )
                }
                if (metricKeys.includes('tasks')) {
                  rows.push(['งานเสร็จ', r.tasks_done], ['งานเปิด', r.open_tasks])
                }
                if (showLeads && metricKeys.includes('leads')) {
                  rows.push(['Lead ใหม่', r.new_leads])
                }
                if (metricKeys.includes('content')) {
                  rows.push(['คอนเทนต์ส่งมอบ', r.content_delivered])
                }
                if (metricKeys.includes('renewals')) {
                  rows.push(['สัญญาใกล้หมด 14 วัน', r.contracts_expiring_14d])
                }
                downloadCsv(`weekly-${r.week_start}`, ['รายการ', 'ค่า'], rows)
              }}
            >
              ส่งออก CSV
            </button>
          )}
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
            รีเฟรช
          </button>
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {scoped && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          แสดงเฉพาะตัวเลขที่บทบาทของคุณเข้าถึงได้ — ตัวเลขอื่นถูกซ่อนตามขอบเขตงาน
        </p>
      )}

      {error && <p className="crm-error">{error}</p>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      {report && !loading && (
        <>
          <section className="card-grid">
            {showFinance && metricKeys.includes('finance') && (
              <article className="card card--accent">
                <h2>รายรับสัปดาห์</h2>
                <p className="stat">{formatMoney(report.revenue_paid)}</p>
                <span className="muted">บาท · {report.payments_paid_count} รายการ</span>
              </article>
            )}
            {showAds && metricKeys.includes('ads') && (
              <>
                <article className="card">
                  <h2>Spend แอด 7 วัน</h2>
                  <p className="stat">{formatMoney(report.ads_spend)}</p>
                  <span className="muted">บาท</span>
                </article>
                <article className="card">
                  <h2>GMV 7 วัน</h2>
                  <p className="stat">{formatMoney(report.ads_gmv)}</p>
                  <span className="muted">บาท</span>
                </article>
                <article className="card">
                  <h2>ROI เฉลี่ย</h2>
                  <p className="stat">
                    {report.ads_avg_roi != null ? report.ads_avg_roi.toFixed(2) : '—'}
                  </p>
                </article>
              </>
            )}
            {metricKeys.includes('tasks') && (
              <article className="card">
                <h2>งานเสร็จสัปดาห์</h2>
                <p className="stat">{report.tasks_done}</p>
                <span className="muted">เปิดค้าง {report.open_tasks}</span>
              </article>
            )}
            {showLeads && metricKeys.includes('leads') && (
              <article className="card">
                <h2>Lead ใหม่</h2>
                <p className="stat">{report.new_leads}</p>
              </article>
            )}
            {metricKeys.includes('content') && (
              <article className="card">
                <h2>คอนเทนต์ส่งมอบ</h2>
                <p className="stat">{report.content_delivered}</p>
              </article>
            )}
          </section>

          <section className="card card--wide">
            <h2>คำแนะนำประจำสัปดาห์</h2>
            <p className="muted weekly-insights-intro">
              วิเคราะห์จากกฎธุรกิจ — ลิงก์แสดงเฉพาะโมดูลที่คุณเข้าถึงได้
            </p>
            <ul className="report-insights">
              {insights.map((ins) => (
                <li
                  key={ins.id}
                  className={`report-insight report-insight--${ins.severity}`}
                >
                  <strong>{ins.title}</strong>
                  <p>{ins.body}</p>
                  {ins.link && (
                    <Link to={ins.link} className="crm-btn crm-btn--ghost">
                      ไปจัดการ
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
