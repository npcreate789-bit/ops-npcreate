import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasAdsPrivilegedBypass, canViewWorkHub } from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import {
  canLinkCustomerClient,
  canLinkCustomerOnboarding,
  canViewCustomer360,
} from '../../customers/access'
import { clientWorkspaceUrl } from '../../customers/customerLinks'
import { listAdsCustomers } from '../api/ads'
import { AdsReportFilterBar } from '../components/AdsReportFilterBar'
import { AdsRoleGuide } from '../components/AdsRoleGuide'
import { formatReportTime, todayIsoDate } from '../constants'
import {
  adsReportStatusClass,
  adsReportStatusLabel,
  matchesAdsFilter,
  type AdsReportFilter,
} from '../pipeline'
import type { AdsCustomerRow } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../ads.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function AdsListPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const userId = profile?.id ?? DEV_OWNER
  const privileged =
    hasAdsPrivilegedBypass(roles) || !isSupabaseConfigured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const show360 = canViewCustomer360(roles) || !configured

  const [rows, setRows] = useState<AdsCustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportFilter, setReportFilter] = useState<AdsReportFilter>('all')

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

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<AdsReportFilter, number>> = {
      all: rows.length,
      pending: 0,
      submitted: 0,
      unassigned: 0,
    }
    for (const row of rows) {
      if (!row.ads_owner_id) counts.unassigned = (counts.unassigned ?? 0) + 1
      else if (row.today_submitted) counts.submitted = (counts.submitted ?? 0) + 1
      else counts.pending = (counts.pending ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(
    () => rows.filter((r) => matchesAdsFilter(r, reportFilter)),
    [rows, reportFilter],
  )

  const submitted = filterCounts.submitted ?? 0
  const pending = filterCounts.pending ?? 0
  const unassigned = filterCounts.unassigned ?? 0
  const today = todayIsoDate()

  function openReport(customerId: string) {
    navigate(`/app/ads/${customerId}`)
  }

  return (
    <div className="page ads-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>งานยิงแอด</h1>
          <p className="muted">
            บันทึกผลรายวัน — ลูกค้าดูสรุปที่พื้นที่ลูกค้า → รายงาน · วันนี้ {today}
          </p>
        </div>
        <div className="ads-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          {showOnboarding && (
            <Link to="/app/onboarding" className="crm-btn crm-btn--ghost">
              รับบรีฟ
            </Link>
          )}
          {show360 && (
            <Link to="/app/customers" className="crm-btn crm-btn--ghost">
              ลูกค้า 360°
            </Link>
          )}
          {showClient && (
            <Link to="/app/client/reports" className="crm-btn crm-btn--ghost">
              รายงานลูกค้า
            </Link>
          )}
        </div>
      </header>

      <AdsRoleGuide />

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {pending > 0 && reportFilter !== 'pending' && (
        <div className="ads-hint-banner" role="status">
          <p>
            มี <strong>{pending}</strong> รายการที่ยังไม่ส่งรายงานวันนี้
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setReportFilter('pending')}
          >
            ดูรายการค้าง
          </button>
        </div>
      )}

      <section className="card-grid ads-kpi-grid">
        <article className="card card--accent">
          <h2>ลูกค้าพร้อมยิงแอด</h2>
          <p className="stat">{rows.length}</p>
        </article>
        <article className="card">
          <h2>ส่งแล้ววันนี้</h2>
          <p className="stat">{submitted}</p>
        </article>
        <article className="card">
          <h2>ยังไม่ส่งวันนี้</h2>
          <p className="stat">{pending}</p>
        </article>
        <article className="card">
          <h2>รอมอบหมาย</h2>
          <p className="stat">{unassigned}</p>
        </article>
      </section>

      <AdsReportFilterBar
        active={reportFilter}
        onSelect={setReportFilter}
        counts={filterCounts}
      />

      <section className="card card--wide">
        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">
            ยังไม่มีลูกค้าที่พร้อมยิงแอด — ตรวจ checklist ที่{' '}
            <Link to="/app/onboarding">รับบรีฟ</Link> ก่อน
          </p>
        )}

        {!loading && rows.length > 0 && displayedRows.length === 0 && (
          <p className="muted">ไม่พบรายการในตัวกรองนี้</p>
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable ads-table">
              <thead>
                <tr>
                  <th>แบรนด์</th>
                  <th>งบบรีฟ/วัน</th>
                  <th>ROI เมื่อวาน</th>
                  <th>รายงานวันนี้</th>
                  <th className="ads-table__actions-head">ลิงก์ด่วน</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openReport(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openReport(row.id)
                    }}
                    tabIndex={0}
                    role="button"
                  >
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
                      <span className={`ads-report-status ${adsReportStatusClass(row)}`}>
                        {row.today_submitted && row.today_reported_at
                          ? `${adsReportStatusLabel(row)} ${formatReportTime(row.today_reported_at)}`
                          : adsReportStatusLabel(row)}
                      </span>
                    </td>
                    <td className="ads-table__actions">
                      <Link
                        to={`/app/ads/${row.id}`}
                        className="ads-table__link ads-table__link--primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        บันทึก
                      </Link>
                      {showOnboarding && (
                        <Link
                          to={`/app/onboarding/${row.id}`}
                          className="ads-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          บรีฟ
                        </Link>
                      )}
                      {show360 && (
                        <Link
                          to={`/app/customers/${row.id}`}
                          className="ads-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          360°
                        </Link>
                      )}
                      {showClient && (
                        <Link
                          to={clientWorkspaceUrl(row.id, 'reports')}
                          className="ads-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ลูกค้า
                        </Link>
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
