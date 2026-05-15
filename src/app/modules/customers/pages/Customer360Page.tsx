import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canLinkCustomerAds,
  canLinkCustomerContent,
  canLinkCustomerCrm,
  canLinkCustomerFinance,
  canLinkCustomerRenewals,
  canViewCustomer360,
} from '../access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { renewalStatusLabel } from '../../renewals/constants'
import type { ContractRenewalStatus } from '../../renewals/types'
import { getCustomer360 } from '../api/customers'
import { customerStatusLabel } from '../constants'
import type { Customer360 } from '../types'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../customers.css'

function formatMoney(n: number) {
  return n.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

export function Customer360Page() {
  const { id } = useParams<{ id: string }>()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const allowed = canViewCustomer360(roles) || !configured

  const [data, setData] = useState<Customer360 | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!allowed || !id) return
    setLoading(true)
    setError(null)
    try {
      const row = await getCustomer360(id)
      if (!row) {
        setError('ไม่พบลูกค้าหรือไม่มีสิทธิ์ดู')
        setData(null)
      } else {
        setData(row)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [allowed, id])

  useEffect(() => {
    void load()
  }, [load])

  if (!allowed) {
    return (
      <div className="page">
        <h1>ลูกค้า 360</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูข้อมูลลูกค้า</p>
      </div>
    )
  }

  if (!id) {
    return (
      <div className="page">
        <p className="crm-error">ไม่พบรหัสลูกค้า</p>
        <Link to="/app/customers">กลับรายการลูกค้า</Link>
      </div>
    )
  }

  const c = data?.customer
  const s = data?.summary

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <p className="muted">
            <Link to="/app/customers">← รายการลูกค้า</Link>
          </p>
          <h1>{c?.brand_name ?? 'ลูกค้า 360'}</h1>
          {c && (
            <p className="muted">
              <span className={`customer-status--${c.status}`}>
                {customerStatusLabel(c.status)}
              </span>
              {c.package_name && ` · ${c.package_name}`}
            </p>
          )}
        </div>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
          รีเฟรช
        </button>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {error && <p className="crm-error">{error}</p>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      {c && s && !loading && (
        <>
          <section className="card card--wide">
            <h2>ข้อมูลติดต่อ</h2>
            <div className="customer-360-meta">
              {c.contact_name && <span>ผู้ติดต่อ: {c.contact_name}</span>}
              {c.phone && <span>โทร: {c.phone}</span>}
              {c.line_id && <span>Line: {c.line_id}</span>}
              {c.business_type && <span>ประเภทธุรกิจ: {c.business_type}</span>}
              {c.contract_start && c.contract_end && (
                <span>
                  สัญญา: {formatBangkokDate(c.contract_start)} –{' '}
                  {formatBangkokDate(c.contract_end)}
                </span>
              )}
              <span>พร้อมยิงแอด: {c.ready_for_ads ? 'ใช่' : 'ยังไม่พร้อม'}</span>
            </div>
            <div className="customer-360-links">
              <Link to={`/app/onboarding/${c.id}`} className="crm-btn crm-btn--ghost">
                รับบรีฟ / Onboarding
              </Link>
              {canLinkCustomerFinance(roles) && (
                <Link to="/app/finance" className="crm-btn crm-btn--ghost">
                  การเงิน
                </Link>
              )}
              {canLinkCustomerAds(roles) && (
                <Link to={`/app/ads/${c.id}`} className="crm-btn crm-btn--ghost">
                  รายงานแอด
                </Link>
              )}
              <Link to="/app/tasks" className="crm-btn crm-btn--ghost">
                งานภายใน
              </Link>
              {canLinkCustomerContent(roles) && (
                <Link to="/app/content" className="crm-btn crm-btn--ghost">
                  คอนเทนต์
                </Link>
              )}
              {canLinkCustomerRenewals(roles) && (
                <Link to="/app/renewals" className="crm-btn crm-btn--ghost">
                  ต่อสัญญา
                </Link>
              )}
              {canLinkCustomerCrm(roles) && c.lead_id && (
                <Link to={`/app/crm/${c.lead_id}`} className="crm-btn crm-btn--ghost">
                  Lead ต้นทาง
                </Link>
              )}
              <Link to="/app/client" className="crm-btn crm-btn--ghost">
                รายงานลูกค้า
              </Link>
            </div>
          </section>

          <section className="card-grid">
            <article className="card">
              <h2>การเงิน</h2>
              <p className="stat">{formatMoney(s.payments_paid_total)}</p>
              <span className="muted">
                ชำระแล้ว · {s.payments_count} รายการ · ค้าง {s.payments_pending}
              </span>
            </article>
            <article className="card">
              <h2>แอด 30 วัน</h2>
              <p className="stat">{formatMoney(s.ads_spend_30d)}</p>
              <span className="muted">Spend · {s.campaigns_count} แคมเปญ</span>
            </article>
            <article className="card">
              <h2>งานเปิด</h2>
              <p className="stat">{s.open_tasks}</p>
            </article>
            <article className="card">
              <h2>คอนเทนต์</h2>
              <p className="stat">{s.content_in_progress}</p>
              <span className="muted">กำลังดำเนินการ</span>
            </article>
            {s.renewal_status && (
              <article className="card">
                <h2>ต่อสัญญา</h2>
                <p className="stat" style={{ fontSize: '1rem' }}>
                  {renewalStatusLabel(s.renewal_status as ContractRenewalStatus)}
                </p>
              </article>
            )}
          </section>
        </>
      )}
    </div>
  )
}
