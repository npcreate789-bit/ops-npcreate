import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewReports } from '../../../../shared/auth/access'
import { bangkokYearMonthPrefix } from '../../../../shared/dates/bangkok'
import { downloadCsv } from '../../../../shared/export/csv'
import { buildReportInsights } from '../api/insights'
import { fetchAdvancedReport } from '../api/reports'
import type { AdvancedReport, ReportInsight } from '../types'
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

export function ReportsPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewReports(roles) || !configured

  const [month, setMonth] = useState(() => bangkokYearMonthPrefix())
  const [report, setReport] = useState<AdvancedReport | null>(null)
  const [insights, setInsights] = useState<ReportInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!allowed) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdvancedReport(month)
      setReport(data)
      setInsights(buildReportInsights(data, roles))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [month, allowed, roles])

  useEffect(() => {
    void load()
  }, [load])

  if (!allowed) {
    return (
      <div className="page">
        <h1>รายงานขั้นสูง</h1>
        <p className="crm-error">ไม่มีสิทธิ์เข้าถึงรายงานนี้</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>รายงานขั้นสูง</h1>
          <p className="muted">สรุปรายเดือนและคำแนะนำอัตโนมัติจากข้อมูลในระบบ (ไม่ใช้ AI ภายนอก)</p>
        </div>
        <div className="crm-page__actions">
          {report && (
            <button
              type="button"
              className="crm-btn crm-btn--ghost"
              onClick={() => {
                const r = report!
                downloadCsv(
                  `report-${month}`,
                  ['รายการ', 'ค่า'],
                  [
                    ['รายรับเดือน', r.revenue_paid],
                    ['ลูกหนี้ค้าง', r.pending_receivables],
                    ['ลูกค้า Active', r.active_customers],
                    ['สัญญาหมด 30 วัน', r.contracts_expiring_30d],
                    ['Spend แอด', r.ads_spend],
                    ['GMV แอด', r.ads_gmv],
                    ['คอนเทนต์ส่งมอบ', r.content_delivered],
                    ['งานเปิด', r.open_tasks],
                  ],
                )
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

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ตัวเลขเป็นตัวอย่าง</p>
      )}

      {error && <p className="crm-error">{error}</p>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      {!loading && report && (
        <>
          <section className="card card--wide">
            <h2>สรุป {monthLabel(report.month)}</h2>
            <div className="report-stat-grid">
              <div className="report-stat">
                <span className="muted">รายรับ (ชำระแล้ว)</span>
                <strong>{formatMoney(report.revenue_paid)}</strong>
                <small className="muted">{report.payments_paid_count} รายการ</small>
              </div>
              <div className="report-stat">
                <span className="muted">ลูกหนี้ค้าง</span>
                <strong>{formatMoney(report.pending_receivables)}</strong>
              </div>
              <div className="report-stat">
                <span className="muted">ลูกค้า Active</span>
                <strong>{report.active_customers}</strong>
              </div>
              <div className="report-stat">
                <span className="muted">สัญญาหมดใน 30 วัน</span>
                <strong>{report.contracts_expiring_30d}</strong>
              </div>
              <div className="report-stat">
                <span className="muted">Spend แอด</span>
                <strong>{formatMoney(report.ads_spend)}</strong>
              </div>
              <div className="report-stat">
                <span className="muted">GMV แอด</span>
                <strong>{formatMoney(report.ads_gmv)}</strong>
              </div>
              <div className="report-stat">
                <span className="muted">คอนเทนต์ส่งมอบ</span>
                <strong>{report.content_delivered}</strong>
              </div>
              <div className="report-stat">
                <span className="muted">งานเปิดอยู่</span>
                <strong>{report.open_tasks}</strong>
              </div>
            </div>
          </section>

          <section className="card card--wide">
            <h2>คำแนะนำอัตโนมัติ</h2>
            <p className="muted">วิเคราะห์จากกฎธุรกิจ — ช่วยจัดลำดับงานที่ควรทำก่อน</p>
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
          </section>
        </>
      )}
    </div>
  )
}
