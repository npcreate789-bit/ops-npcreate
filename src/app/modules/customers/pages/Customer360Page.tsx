import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { downloadCsv } from '../../../../shared/export/csv'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { renewalStatusLabel } from '../../renewals/constants'
import type { ContractRenewalStatus } from '../../renewals/types'
import {
  canLinkCustomerAds,
  canLinkCustomerClient,
  canLinkCustomerChat,
  canLinkCustomerCrm,
  canLinkCustomerFinance,
  canLinkCustomerOnboarding,
  canLinkCustomerRenewals,
  canShowCustomer360ContentMetrics,
  canShowCustomer360FinanceMetrics,
  canShowCustomer360Link,
  canViewCustomer360,
  customer360MetricKeysForRoles,
  isCustomer360Scoped,
} from '../access'
import { CustomerTimelineSection } from '../components/CustomerTimelineSection'
import { getCustomer360 } from '../api/customers'
import { listProjectsForCustomer } from '../../projects/api/projects'
import { projectStatusLabel } from '../../projects/constants'
import type { Project } from '../../projects/types'
import { listQuotationsByCustomer } from '../../sales/api/quotations'
import { QuotationStatusBadge } from '../../sales/components/QuotationStatusBadge'
import type { Quotation } from '../../sales/types'
import { usePageEntityLabel } from '../../../layout/PageHeadingContext'
import { customerStatusLabel } from '../constants'
import {
  clientWorkspaceUrl,
  financeUrlForCustomer,
  chatUrlForCustomer,
  renewalsUrlForCustomer,
  tasksUrlForCustomer,
  primaryProjectForCustomer,
} from '../customerLinks'
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
  const scoped = isCustomer360Scoped(roles) && configured
  const metricKeys = useMemo(() => customer360MetricKeysForRoles(roles), [roles])
  const showFinance = canShowCustomer360FinanceMetrics(roles) || !configured
  const showAds = canLinkCustomerAds(roles) || !configured
  const showContent = canShowCustomer360ContentMetrics(roles) || !configured

  const [data, setData] = useState<Customer360 | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerProjects, setCustomerProjects] = useState<Project[]>([])
  const [customerQuotations, setCustomerQuotations] = useState<Quotation[]>([])
  const showProjects = canShowCustomer360Link(roles, '/app/projects') || !configured
  const showChat = canLinkCustomerChat(roles) || !configured
  const primaryProject = useMemo(
    () => primaryProjectForCustomer(customerProjects),
    [customerProjects],
  )

  const timelineContext = useMemo(
    () =>
      data?.customer
        ? {
            customerId: data.customer.id,
            leadId: data.customer.lead_id,
            contractEnd: data.customer.contract_end,
            brandName: data.customer.brand_name,
          }
        : null,
    [data?.customer],
  )

  const load = useCallback(async () => {
    if (!allowed || !id) return
    setLoading(true)
    setError(null)
    try {
      const row = await getCustomer360(id)
      if (!row) {
        setError('ไม่พบลูกค้าหรือไม่มีสิทธิ์ดู (RLS)')
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

  useEffect(() => {
    if (!id || !showProjects) {
      setCustomerProjects([])
      return
    }
    let cancelled = false
    listProjectsForCustomer(id)
      .then((rows) => {
        if (!cancelled) setCustomerProjects(rows)
      })
      .catch(() => {
        if (!cancelled) setCustomerProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [id, showProjects])

  useEffect(() => {
    const customerId = data?.customer?.id
    if (!customerId) {
      setCustomerQuotations([])
      return
    }
    let cancelled = false
    listQuotationsByCustomer(customerId, data?.customer?.lead_id ?? null)
      .then((rows) => {
        if (!cancelled) setCustomerQuotations(rows.slice(0, 5))
      })
      .catch(() => {
        if (!cancelled) setCustomerQuotations([])
      })
    return () => {
      cancelled = true
    }
  }, [data?.customer?.id, data?.customer?.lead_id])

  usePageEntityLabel(data?.customer?.brand_name ?? null)

  function exportSummary() {
    if (!data) return
    const { customer: c, summary: s } = data
    const rows: (string | number)[][] = [
      ['แบรนด์', c.brand_name],
      ['สถานะ', customerStatusLabel(c.status)],
    ]
    if (showFinance && metricKeys.includes('finance')) {
      rows.push(
        ['รายรับชำระแล้ว', s.payments_paid_total],
        ['รายการชำระ', s.payments_count],
        ['ค้างชำระ', s.payments_pending],
      )
    }
    if (showAds && metricKeys.includes('ads')) {
      rows.push(['Spend แอด 30 วัน', s.ads_spend_30d], ['แคมเปญ', s.campaigns_count])
    }
    if (metricKeys.includes('tasks')) rows.push(['งานเปิด', s.open_tasks])
    if (showContent && metricKeys.includes('content')) {
      rows.push(['คอนเทนต์กำลังทำ', s.content_in_progress])
    }
    downloadCsv(`customer-${c.id.slice(0, 8)}`, ['รายการ', 'ค่า'], rows)
  }

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
        <div className="crm-page__actions">
          {data && (
            <button type="button" className="crm-btn crm-btn--ghost" onClick={exportSummary}>
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
          แสดงเฉพาะตัวเลขและลิงก์ที่บทบาทของคุณเข้าถึงได้ — ข้อมูลอื่นถูกซ่อนหรือเป็น 0 ตาม RLS
        </p>
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
            <p className="customer-360-flow-hint muted">
              ลำดับงาน: การเงิน → รับบรีฟ → สร้างโปรเจกต์ → แชท/งาน — ลูกค้าใช้พื้นที่ลูกค้าแยกจากทีม
            </p>

            <div className="customer-360-link-groups">
              <div className="customer-360-link-group">
                <h3 className="customer-360-link-group__title">ทีมงาน</h3>
                <div className="customer-360-links">
                  {canLinkCustomerOnboarding(roles) && (
                    <Link to={`/app/onboarding/${c.id}`} className="crm-btn crm-btn--ghost">
                      รับบรีฟ
                    </Link>
                  )}
                  {showProjects && (
                    <Link
                      to={`/app/projects/new?customerId=${c.id}`}
                      className="crm-btn crm-btn--ghost"
                    >
                      + โปรเจกต์
                    </Link>
                  )}
                  {canLinkCustomerFinance(roles) && (
                    <Link to={financeUrlForCustomer(c.id)} className="crm-btn crm-btn--ghost">
                      การเงิน
                    </Link>
                  )}
                  {showChat && (
                    <Link
                      to={chatUrlForCustomer(primaryProject?.id)}
                      className="crm-btn crm-btn--ghost"
                    >
                      แชทลูกค้า
                    </Link>
                  )}
                  {/*
                    แชท LINE OA ยังเป็นช่องทางหลักที่ลูกค้าจะทักเข้ามาแม้หลังปิดการขาย
                    (line-webhook ลง message ที่ lead row เดิมไม่ตัดที่ status)
                    เปิดด้วย focusLineChat=true เพื่อ scroll/focus ไปที่แผงแชท LINE เลย
                  */}
                  {canLinkCustomerCrm(roles) && c.lead_id && (
                    <Link
                      to={`/app/crm/${c.lead_id}`}
                      state={{ focusLineChat: true }}
                      className="crm-btn crm-btn--ghost"
                    >
                      แชท LINE OA
                    </Link>
                  )}
                  {canShowCustomer360Link(roles, '/app/tasks') && (
                    <Link
                      to={tasksUrlForCustomer(primaryProject?.id, c.id)}
                      className="crm-btn crm-btn--ghost"
                    >
                      งานภายใน
                    </Link>
                  )}
                  {canLinkCustomerAds(roles) && (
                    <Link to={`/app/ads/${c.id}`} className="crm-btn crm-btn--ghost">
                      รายงานแอด
                    </Link>
                  )}
                  {canShowCustomer360ContentMetrics(roles) && (
                    <Link to="/app/content" className="crm-btn crm-btn--ghost">
                      คอนเทนต์
                    </Link>
                  )}
                  {canLinkCustomerRenewals(roles) && (
                    <Link to={renewalsUrlForCustomer(c.id)} className="crm-btn crm-btn--ghost">
                      ต่อสัญญา
                    </Link>
                  )}
                  {canLinkCustomerCrm(roles) && c.lead_id && (
                    <Link to={`/app/crm/${c.lead_id}`} className="crm-btn crm-btn--ghost">
                      Lead ต้นทาง
                    </Link>
                  )}
                </div>
              </div>

              {canLinkCustomerClient(roles) && (
                <div className="customer-360-link-group">
                  <h3 className="customer-360-link-group__title">พื้นที่ลูกค้า (ดูแทนลูกค้า)</h3>
                  <div className="customer-360-links">
                    <Link to={clientWorkspaceUrl(c.id)} className="crm-btn crm-btn--primary">
                      ภาพรวม
                    </Link>
                    <Link to={clientWorkspaceUrl(c.id, 'brief')} className="crm-btn crm-btn--ghost">
                      บรีฟ
                    </Link>
                    <Link to={clientWorkspaceUrl(c.id, 'chat')} className="crm-btn crm-btn--ghost">
                      แชท
                    </Link>
                    <Link
                      to={clientWorkspaceUrl(c.id, 'projects')}
                      className="crm-btn crm-btn--ghost"
                    >
                      โปรเจกต์
                    </Link>
                    <Link
                      to={clientWorkspaceUrl(c.id, 'payment')}
                      className="crm-btn crm-btn--ghost"
                    >
                      ชำระเงิน
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </section>

          {showProjects && (
            <section className="card card--wide">
              <h2 className="crm-section-title">โปรเจกต์</h2>
              {customerProjects.length === 0 ? (
                <p className="muted">
                  ยังไม่มีโปรเจกต์ —{' '}
                  <Link to={`/app/projects/new?customerId=${c.id}`}>สร้างโปรเจกต์</Link>
                </p>
              ) : (
                <ul className="customer-360-project-list">
                  {customerProjects.map((p) => (
                    <li key={p.id}>
                      <Link to={`/app/projects/${p.id}`}>
                        <strong>{p.project_name}</strong>
                      </Link>
                      <span className="muted">
                        {' '}
                        · {projectStatusLabel(p.status)} · {p.progress}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="card card--wide">
            <header className="crm-lead-form-card__head">
              <div>
                <h2 className="crm-section-title">ใบเสนอราคาล่าสุด</h2>
                <p className="crm-lead-form-card__hint">
                  แสดง 5 รายการล่าสุด — เปิดดูรายละเอียดเต็มในหน้าใบเสนอราคา
                </p>
              </div>
              <Link to="/app/sales" className="crm-btn crm-btn--ghost">
                ดูทั้งหมด
              </Link>
            </header>
            {customerQuotations.length === 0 ? (
              <p className="muted">
                ยังไม่มีใบเสนอราคาผูกกับลูกค้านี้ — สามารถสร้างจากหน้า{' '}
                <Link to="/app/sales">ขาย</Link> ได้
              </p>
            ) : (
              <ul className="crm-lead-quotations__list">
                {customerQuotations.map((q) => (
                  <li key={q.id} className="crm-lead-quotations__item">
                    <div className="crm-lead-quotations__main">
                      <Link
                        to={`/app/sales/quotations/${q.id}`}
                        className="crm-inline-link"
                      >
                        {q.quotation_number || `ฉบับ ${q.id.slice(0, 8)}`}
                      </Link>
                      <p className="muted">
                        {q.sent_at
                          ? new Date(q.sent_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}{' '}
                        ·{' '}
                        {new Intl.NumberFormat('th-TH', {
                          style: 'currency',
                          currency: 'THB',
                          maximumFractionDigits: 0,
                        }).format(q.total ?? 0)}
                      </p>
                    </div>
                    <QuotationStatusBadge status={q.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-grid">
            {showFinance && metricKeys.includes('finance') && (
              <article className="card card--accent">
                <h2>การเงิน</h2>
                <p className="stat">{formatMoney(s.payments_paid_total)}</p>
                <span className="muted">
                  ชำระแล้ว · {s.payments_count} รายการ · ค้าง {s.payments_pending}
                </span>
              </article>
            )}
            {showAds && metricKeys.includes('ads') && (
              <article className="card">
                <h2>แอด 30 วัน</h2>
                <p className="stat">{formatMoney(s.ads_spend_30d)}</p>
                <span className="muted">Spend · {s.campaigns_count} แคมเปญ</span>
              </article>
            )}
            {metricKeys.includes('tasks') && (
              <article className="card">
                <h2>งานเปิด</h2>
                <p className="stat">{s.open_tasks}</p>
              </article>
            )}
            {showContent && metricKeys.includes('content') && (
              <article className="card">
                <h2>คอนเทนต์</h2>
                <p className="stat">{s.content_in_progress}</p>
                <span className="muted">กำลังดำเนินการ</span>
              </article>
            )}
            {metricKeys.includes('renewals') && s.renewal_status && (
              <article className="card">
                <h2>ต่อสัญญา</h2>
                <p className="stat customer-360-renewal-stat">
                  {renewalStatusLabel(s.renewal_status as ContractRenewalStatus)}
                </p>
              </article>
            )}
          </section>

          {timelineContext && <CustomerTimelineSection context={timelineContext} />}
        </>
      )}
    </div>
  )
}
