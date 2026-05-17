import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bangkokYearMonthPrefix, formatBangkokDate } from '../../../../shared/dates/bangkok'
import { printDocument } from '../../../../shared/print/printDocument'
import {
  clientAdsMonthLabel,
  fetchClientMonthlyAdsReport,
  type ClientMonthlyAdsReport,
} from '../api/clientAdsReport'
import { ClientMonthlyAdsPrintDocument } from '../components/ClientMonthlyAdsPrintDocument'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../client.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function ClientReportsPage() {
  const ws = useClientWorkspaceContext()
  const customerId = ws.customerId

  const [month, setMonth] = useState(() => bangkokYearMonthPrefix())
  const [monthly, setMonthly] = useState<ClientMonthlyAdsReport | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  const loadMonthly = useCallback(async () => {
    if (!customerId) {
      setMonthly(null)
      return
    }
    setMonthlyLoading(true)
    setMonthlyError(null)
    try {
      setMonthly(await fetchClientMonthlyAdsReport(customerId, month))
    } catch (e) {
      setMonthlyError(e instanceof Error ? e.message : 'โหลดรายงานไม่สำเร็จ')
      setMonthly(null)
    } finally {
      setMonthlyLoading(false)
    }
  }, [customerId, month])

  useEffect(() => {
    void loadMonthly()
  }, [loadMonthly])

  if (ws.loading) return null

  if (!ws.data) {
    return (
      <div className="page client-page">
        <h2>รายงานผล</h2>
        <p className="muted">ยังไม่มีข้อมูลรายงานสำหรับบัญชีนี้</p>
      </div>
    )
  }

  const { ads_summary } = ws.data

  return (
    <div className="page client-page client-reports-page">
      <header className="page__header client-reports__header">
        <div>
          <h2>รายงานผล</h2>
          <p className="muted">สรุปแอดรายเดือนและภาพรวม 7 วันล่าสุด</p>
        </div>
        <label className="task-field">
          <span className="task-field__label">เดือน</span>
          <input
            type="month"
            className="crm-input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </header>

      <section className="card card--wide">
        <h2>ภาพรวม 7 วันล่าสุด</h2>
        <p className="muted">
          รายงานล่าสุด: {formatBangkokDate(ads_summary.latest_report_date)}
        </p>
        <div className="client-metrics">
          <div className="client-metric">
            <span className="muted">Spend</span>
            <strong>{formatMoney(ads_summary.last_7_days_spend)}</strong>
          </div>
          <div className="client-metric">
            <span className="muted">GMV</span>
            <strong>{formatMoney(ads_summary.last_7_days_gmv)}</strong>
          </div>
          <div className="client-metric">
            <span className="muted">ROI</span>
            <strong>
              {ads_summary.last_7_days_roi != null
                ? ads_summary.last_7_days_roi.toFixed(2)
                : '—'}
            </strong>
          </div>
        </div>
      </section>

      <section className="card card--wide">
        <header className="client-reports__section-head">
          <div>
            <h2>รายงานรายเดือน — {clientAdsMonthLabel(month)}</h2>
            <p className="muted">ตารางรายวันจากทีม Ads — พิมพ์เป็น PDF ส่งลูกค้าได้</p>
          </div>
          {monthly && (
            <button
              type="button"
              className="crm-btn crm-btn--primary no-print"
              onClick={() => printDocument()}
            >
              พิมพ์ / บันทึก PDF
            </button>
          )}
        </header>

        {monthlyError && <p className="crm-error">{monthlyError}</p>}
        {monthlyLoading && <p className="muted">กำลังโหลดรายงานรายเดือน...</p>}

        {!monthlyLoading && monthly && (
          <>
            <div className="client-metrics no-print">
              <div className="client-metric">
                <span className="muted">Spend เดือนนี้</span>
                <strong>{formatMoney(monthly.totals.spend)}</strong>
              </div>
              <div className="client-metric">
                <span className="muted">GMV เดือนนี้</span>
                <strong>{formatMoney(monthly.totals.gmv)}</strong>
              </div>
              <div className="client-metric">
                <span className="muted">ROI</span>
                <strong>
                  {monthly.totals.roi != null ? monthly.totals.roi.toFixed(2) : '—'}
                </strong>
              </div>
              <div className="client-metric">
                <span className="muted">วันมีรายงาน</span>
                <strong>
                  {monthly.submitted_days}/{monthly.days_in_month}
                </strong>
              </div>
            </div>

            {monthly.days.length > 0 ? (
              <div className="crm-table-wrap no-print">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>Spend</th>
                      <th>GMV</th>
                      <th>ออเดอร์</th>
                      <th>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.days.map((row) => (
                      <tr key={row.report_date}>
                        <td>{formatBangkokDate(row.report_date)}</td>
                        <td>{formatMoney(row.spend)}</td>
                        <td>{formatMoney(row.gmv)}</td>
                        <td>{row.orders}</td>
                        <td>{row.roi != null ? row.roi.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted no-print">ยังไม่มีข้อมูลรายวันในเดือนนี้</p>
            )}

            <section className="client-ads-report-print-wrap">
              <ClientMonthlyAdsPrintDocument report={monthly} />
            </section>
          </>
        )}
      </section>

      {!ws.isClientOnly && (
        <p className="muted no-print">
          รายงานรวมทั้งบริษัท (ทีม) — <Link to="/app/reports">รายงานขั้นสูง</Link>
        </p>
      )}
    </div>
  )
}
