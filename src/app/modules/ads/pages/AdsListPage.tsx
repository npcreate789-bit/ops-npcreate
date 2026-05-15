import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasAdsPrivilegedBypass } from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listAdsCustomers } from '../api/ads'
import { formatReportTime, todayIsoDate } from '../constants'
import type { AdsCustomerRow } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../ads.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function AdsListPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const privileged =
    hasAdsPrivilegedBypass(profile?.roles ?? []) || !isSupabaseConfigured

  const [rows, setRows] = useState<AdsCustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listAdsCustomers(userId, privileged)
      .then((data) => {
        if (!cancelled) setRows(data)
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
  }, [userId, privileged])

  const submitted = rows.filter((r) => r.today_submitted).length
  const pending = rows.length - submitted
  const today = todayIsoDate()

  return (
    <div className="page">
      <header className="page__header sales-page__header">
        <div>
          <h1>งานยิงแอด</h1>
          <p>รายงานผลรายวัน — {today}</p>
        </div>
      </header>

      <section className="card-grid">
        <article className="card card--accent">
          <h2>ลูกค้าที่ดูแล</h2>
          <p className="stat">{rows.length}</p>
        </article>
        <article className="card">
          <h2>ส่งรายงานวันนี้แล้ว</h2>
          <p className="stat">{submitted}</p>
        </article>
        <article className="card">
          <h2>ยังไม่ส่งวันนี้</h2>
          <p className="stat">{pending}</p>
        </article>
      </section>

      <section className="card card--wide">
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">
            ยังไม่มีลูกค้าที่พร้อมยิงแอด — รอ Onboarding ครบ checklist ก่อน
          </p>
        )}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>งบบรีฟ/วัน</th>
                  <th>ROI เมื่อวาน</th>
                  <th>รายงานวันนี้</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => navigate(`/app/ads/${row.id}`)}>
                    <td>
                      <strong>{row.brand_name}</strong>
                    </td>
                    <td>
                      {row.daily_budget != null
                        ? row.daily_budget.toLocaleString('th-TH')
                        : '—'}
                    </td>
                    <td>
                      {row.yesterday_roi != null ? (
                        <span className={row.yesterday_roi < 2 ? 'ads-roi-warn' : undefined}>
                          {row.yesterday_roi.toFixed(2)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {!row.ads_owner_id && (
                        <span className="ads-report-status ads-report-status--unassigned">
                          รอมอบหมาย
                        </span>
                      )}
                      {row.ads_owner_id && (
                        <span
                          className={
                            row.today_submitted
                              ? 'ads-report-status ads-report-status--done'
                              : 'ads-report-status ads-report-status--pending'
                          }
                        >
                          {row.today_submitted
                            ? `ส่งแล้ว ${formatReportTime(row.today_reported_at)}`
                            : 'ยังไม่ส่ง'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
