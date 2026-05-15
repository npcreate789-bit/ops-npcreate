import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasClientPortalStaffPreview } from '../../../../shared/auth/access'
import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import { fetchClientReport } from '../api/clientReport'
import type { ClientReport } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../client.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function ClientPortalPage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const isClientOnly =
    roles.includes('client') &&
    !hasClientPortalStaffPreview(roles) &&
    configured
  const canPreview = hasClientPortalStaffPreview(roles) || !configured

  const [data, setData] = useState<ClientReport | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [previewId, setPreviewId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const report = await fetchClientReport(
        userId,
        canPreview && previewId ? previewId : undefined,
      )
      setData(report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId, canPreview, previewId])

  useEffect(() => {
    if (!canPreview) return
    listCustomersForSelect()
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [canPreview])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลดรายงาน...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page">
        <header className="page__header client-hero">
          <h1>รายงานลูกค้า</h1>
          <p className="muted">สรุปผลแอด ความคืบหน้า และคอนเทนต์ที่ส่งมอบ</p>
        </header>

        {canPreview && customers.length > 0 && (
          <section className="card card--wide">
            <label className="task-field">
              <span className="task-field__label">ดูตัวอย่างรายงาน (ทีมงาน)</span>
              <select
                className="task-select"
                value={previewId}
                onChange={(e) => setPreviewId(e.target.value)}
              >
                <option value="">— เลือกลูกค้า —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.brand_name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        <section className="card card--wide">
          <p className="crm-error">
            {error ??
              (canPreview
                ? 'เลือกลูกค้าด้านบนเพื่อดูตัวอย่าง หรือผูกบัญชี client ที่หน้าจัดการผู้ใช้'
                : 'ยังไม่มีสิทธิ์เข้าถึงรายงาน — ติดต่อทีมงาน NP Create')}
          </p>
          {canPreview && (
            <p className="muted admin-hint">
              <Link to="/app/admin">จัดการผู้ใช้</Link> → มอบบทบาท client + เลือกลูกค้า
            </p>
          )}
        </section>
      </div>
    )
  }

  const { customer, onboarding_progress, ads_summary, delivered_content } = data

  return (
    <div className="page">
      <header className="page__header client-hero phase2-page__header">
        <div>
          <p className="muted">รายงานลูกค้า</p>
          <h1>{customer.brand_name}</h1>
          <p className="muted">
            สัญญาถึง {formatBangkokDate(customer.contract_end)} · สถานะ {customer.status}
            {customer.ready_for_ads ? ' · พร้อมยิงแอด' : ''}
          </p>
          {canPreview && !isClientOnly && (
            <p className="phase2-scope-badge">โหมดตัวอย่าง (ทีมงาน)</p>
          )}
        </div>
        {canPreview && (
          <label className="task-field" style={{ minWidth: '12rem' }}>
            <span className="task-field__label">เปลี่ยนลูกค้า</span>
            <select
              className="task-select"
              value={previewId || customer.id}
              onChange={(e) => setPreviewId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {error && <p className="crm-error">{error}</p>}

      <section className="card-grid">
        <article className="card">
          <h2>ความคืบหน้า Onboarding</h2>
          <p className="stat">{onboarding_progress}%</p>
          <div className="phase2-progress" aria-hidden>
            <div
              className="phase2-progress__bar"
              style={{ width: `${Math.min(100, onboarding_progress)}%` }}
            />
          </div>
        </article>
        <article className="card">
          <h2>ใช้จ่ายแอด 7 วัน</h2>
          <p className="stat">{formatMoney(ads_summary.last_7_days_spend)}</p>
          <span className="muted">บาท</span>
        </article>
        <article className="card">
          <h2>GMV 7 วัน</h2>
          <p className="stat">{formatMoney(ads_summary.last_7_days_gmv)}</p>
          <span className="muted">บาท</span>
        </article>
        <article className="card">
          <h2>ROI 7 วัน</h2>
          <p className="stat">
            {ads_summary.last_7_days_roi != null
              ? ads_summary.last_7_days_roi.toFixed(2)
              : '—'}
          </p>
        </article>
      </section>

      <section className="card card--wide">
        <h2>สรุปแอด</h2>
        <p className="muted">
          รายงานล่าสุด: {formatBangkokDate(ads_summary.latest_report_date)}
        </p>
        <div className="client-metrics">
          <div className="client-metric">
            <span className="muted">Spend รวม</span>
            <strong>{formatMoney(ads_summary.last_7_days_spend)}</strong>
          </div>
          <div className="client-metric">
            <span className="muted">GMV รวม</span>
            <strong>{formatMoney(ads_summary.last_7_days_gmv)}</strong>
          </div>
        </div>
      </section>

      <section className="card card--wide">
        <h2>คอนเทนต์ที่ส่งมอบแล้ว</h2>
        {delivered_content.length === 0 && (
          <p className="muted">ยังไม่มีไฟล์ส่งมอบในระบบ</p>
        )}
        <ul className="client-content-list">
          {delivered_content.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span className="muted"> · {item.format}</span>
              <br />
              <small className="muted">{formatBangkokDateTime(item.delivered_at)}</small>
              {item.deliverable_url && (
                <>
                  <br />
                  <a href={item.deliverable_url} target="_blank" rel="noreferrer">
                    เปิดไฟล์
                  </a>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
