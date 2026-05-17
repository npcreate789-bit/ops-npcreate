import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasAdsPrivilegedBypass } from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import {
  canLinkCustomerClient,
  canLinkCustomerOnboarding,
  canViewCustomer360,
} from '../../customers/access'
import { clientWorkspaceUrl } from '../../customers/customerLinks'
import {
  getCampaignForCustomer,
  getDailyMetric,
  listRecentMetrics,
  upsertDailyMetric,
} from '../api/ads'
import { ProductLinesEditor } from '../components/ProductLinesEditor'
import {
  calcCpa,
  calcRoi,
  formatReportDateTime,
  formatReportedAt,
  formatReportTime,
  todayIsoDate,
  validateAdsReportFields,
  type AdsReportFieldErrors,
  type AdsReportFieldKey,
} from '../constants'
import {
  metricProductsSummary,
  normalizeProductLines,
  productLinesForForm,
  sumProductLineGmv,
  sumProductLineOrders,
  sumProductLineSpend,
  summarizeTopSku,
  validateProductLineRows,
} from '../productLines'
import type { Campaign, DailyMetric, ProductLine } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../ads.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatTotalDisplay(n: number): string {
  return n > 0 ? n.toLocaleString('th-TH') : '—'
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <span className="crm-field-error" role="alert">
      {message}
    </span>
  )
}

function SummaryMetric({
  label,
  value,
  error,
}: {
  label: string
  value: string
  error?: string
}) {
  return (
    <div className="ads-summary-metric">
      <span className="ads-summary-metric__label">{label}</span>
      <span className="ads-summary-metric__value">{value}</span>
      <FieldError message={error} />
    </div>
  )
}

export function AdsReportPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile, hasAnyRole, configured } = useAuth()
  const roles = profile?.roles ?? []
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const show360 = canViewCustomer360(roles) || !configured
  const ownerId = profile?.id ?? DEV_OWNER
  const privileged =
    hasAdsPrivilegedBypass(profile?.roles ?? []) || !isSupabaseConfigured
  const allowClaim =
    hasAnyRole(['ads', 'senior_ads']) || !isSupabaseConfigured
  const canEdit =
    hasAnyRole(['ads', 'senior_ads', 'ceo', 'operations', 'dev']) || !isSupabaseConfigured

  const reportDate = searchParams.get('date') ?? todayIsoDate()

  const [brandName, setBrandName] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [briefDailyBudget, setBriefDailyBudget] = useState<number | null>(null)
  const [history, setHistory] = useState<DailyMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [productLines, setProductLines] = useState<ProductLine[]>([])
  const [topVideo, setTopVideo] = useState('')
  const [issue, setIssue] = useState('')
  const [nextPlan, setNextPlan] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AdsReportFieldErrors>({})
  const [reportedAt, setReportedAt] = useState<string | null>(null)

  const spendTotal = useMemo(() => sumProductLineSpend(productLines), [productLines])
  const gmvTotal = useMemo(() => sumProductLineGmv(productLines), [productLines])
  const ordersTotal = useMemo(() => sumProductLineOrders(productLines), [productLines])

  function clearMetricFieldErrors() {
    setFieldErrors((prev) => {
      if (!prev.spend && !prev.gmv && !prev.orders && !prev.skuLines) return prev
      const next = { ...prev }
      delete next.spend
      delete next.gmv
      delete next.orders
      delete next.skuLines
      return next
    })
  }

  function clearFieldError(key: AdsReportFieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const roi = useMemo(() => calcRoi(spendTotal, gmvTotal), [spendTotal, gmvTotal])
  const cpa = useMemo(() => calcCpa(spendTotal, ordersTotal), [spendTotal, ordersTotal])

  const budgetUsagePct = useMemo(() => {
    if (briefDailyBudget == null || briefDailyBudget <= 0 || spendTotal <= 0) return null
    return Math.round((spendTotal / briefDailyBudget) * 100)
  }, [briefDailyBudget, spendTotal])

  const load = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    setError(null)
    try {
      const ctx = await getCampaignForCustomer(customerId, ownerId, { allowClaim, privileged })
      setCampaign(ctx.campaign)
      setBrandName(ctx.customerBrand)
      setBriefDailyBudget(ctx.briefDailyBudget)

      const [metric, recent] = await Promise.all([
        getDailyMetric(ctx.campaign.id, reportDate),
        listRecentMetrics(ctx.campaign.id),
      ])
      setHistory(recent)

      if (metric) {
        setProductLines(productLinesForForm(metric))
        setTopVideo(metric.top_video ?? '')
        setIssue(metric.issue ?? '')
        setNextPlan(metric.next_plan ?? '')
        setReportedAt(metric.reported_at)
      } else {
        setProductLines(productLinesForForm(null))
        setTopVideo('')
        setIssue('')
        setNextPlan('')
        setReportedAt(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [customerId, ownerId, reportDate, allowClaim, privileged])

  useEffect(() => {
    void load()
  }, [load])

  function handleDateChange(date: string) {
    if (date > todayIsoDate()) {
      setFieldErrors((prev) => ({
        ...prev,
        reportDate: 'กรุณาเลือกวันที่รายงานไม่เกินวันนี้',
      }))
      return
    }
    clearFieldError('reportDate')
    setSearchParams(date === todayIsoDate() ? {} : { date })
    setSaveSuccess(false)
  }

  async function handleSave() {
    if (!campaign || !canEdit) return

    const { errors, values } = validateAdsReportFields({
      reportDate,
      spendTotal,
      gmvTotal,
      ordersTotal,
      skuLineError: validateProductLineRows(productLines),
    })

    if (!values) {
      setFieldErrors(errors)
      setError('กรุณาตรวจสอบและระบุข้อมูลในแต่ละช่องที่มีข้อความแจ้งเตือน')
      return
    }

    setFieldErrors({})
    setSaving(true)
    setError(null)
    setSaveSuccess(false)
    try {
      const lines = normalizeProductLines(productLines)
      await upsertDailyMetric({
        campaign_id: campaign.id,
        report_date: reportDate,
        spend: values.spend,
        gmv: values.gmv,
        orders: values.orders,
        roi: calcRoi(values.spend, values.gmv),
        cpa: calcCpa(values.spend, values.orders),
        product_lines: lines,
        top_product: summarizeTopSku(productLines),
        top_video: topVideo.trim() || null,
        issue: issue.trim() || null,
        next_plan: nextPlan.trim() || null,
        created_by: ownerId,
      })
      setSaveSuccess(true)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="page">
        <p className="crm-error">{error ?? 'ไม่พบลูกค้า'}</p>
        <Link to="/app/ads">← กลับรายการ</Link>
      </div>
    )
  }

  return (
    <div className="page ads-report-page">
      <header className="page__header crm-page__header">
        <Link to="/app/ads" className="crm-back">
          ← กลับรายการ
        </Link>
        <h1>{brandName}</h1>
        <p className="muted">
          {campaign.name} · {campaign.campaign_type} — บันทึกที่นี่ ลูกค้าดูสรุปใน{' '}
          {customerId && showClient ? (
            <Link to={clientWorkspaceUrl(customerId, 'reports')}>พื้นที่ลูกค้า → รายงาน</Link>
          ) : (
            'พื้นที่ลูกค้า → รายงาน'
          )}
        </p>
      </header>

      {customerId && (show360 || showOnboarding || showClient) && (
        <nav className="ads-related-links" aria-label="ลิงก์ที่เกี่ยวข้อง">
          {show360 && (
            <Link to={`/app/customers/${customerId}`} className="crm-btn crm-btn--ghost crm-btn--sm">
              ลูกค้า 360°
            </Link>
          )}
          {showOnboarding && (
            <Link
              to={`/app/onboarding/${customerId}`}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              รับบรีฟ
            </Link>
          )}
          {showClient && (
            <Link
              to={clientWorkspaceUrl(customerId, 'reports')}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              รายงานลูกค้า
            </Link>
          )}
          <Link to="/app/ads" className="crm-btn crm-btn--ghost crm-btn--sm">
            รายการแอดทั้งหมด
          </Link>
        </nav>
      )}

      {error && <p className="crm-error">{error}</p>}
      {saveSuccess && (
        <p className="crm-banner ads-save-success">
          บันทึกรายงานแล้ว
          {reportedAt ? ` — ส่งเมื่อ ${formatReportedAt(reportedAt)}` : ''}
        </p>
      )}

      {!canEdit && (
        <p className="crm-banner">ดูอย่างเดียว — บันทึกรายงานได้เฉพาะทีมยิงแอด</p>
      )}

      <section className="card card--wide ads-brief-budget-card">
        <div className="ads-brief-budget">
          <div>
            <p className="ads-brief-budget__label">งบแอด / วัน (จากบรีฟลูกค้า)</p>
            <p className="ads-brief-budget__value">
              {briefDailyBudget != null
                ? `${briefDailyBudget.toLocaleString('th-TH')} บาท`
                : 'ยังไม่กรอก — แก้ได้ที่ Onboarding'}
            </p>
          </div>
          {customerId && (
            <Link
              to={`/app/onboarding/${customerId}`}
              className="crm-btn crm-btn--ghost ads-brief-budget__link"
            >
              {briefDailyBudget != null ? 'เปิดบรีฟ' : 'กรอกงบบรีฟ'}
            </Link>
          )}
        </div>
        {budgetUsagePct != null && (
          <p
            className={
              budgetUsagePct > 100
                ? 'ads-brief-budget__usage ads-brief-budget__usage--over'
                : 'ads-brief-budget__usage'
            }
          >
            Spend วันนี้ {spendTotal.toLocaleString('th-TH')} บาท
            {spendTotal > 0 && ` (${budgetUsagePct}% ของงบบรีฟ)`}
          </p>
        )}
      </section>

      <section className="card card--wide">
        <form
          className="crm-form ads-report-form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
        >
          <label className="ads-report-date-only">
            วันที่รายงาน *
            <input
              type="date"
              className={`crm-input ads-date-input${fieldErrors.reportDate ? ' crm-input--invalid' : ''}`}
              value={reportDate}
              max={todayIsoDate()}
              disabled={!canEdit}
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <FieldError message={fieldErrors.reportDate} />
            {reportedAt && (
              <span className="ads-reported-at muted">
                เวลารายงาน {formatReportDateTime(reportDate, reportedAt)}
              </span>
            )}
          </label>

          <h2 className="crm-section-title">
            ผลการยิง — {reportDate}
            {reportedAt && (
              <span className="ads-section-report-time"> {formatReportTime(reportedAt)}</span>
            )}
          </h2>

          <div className="ads-report-full ads-sku-spend-section">
            <span className="ads-product-lines-label">รายงานผลตาม SKU *</span>
            <ProductLinesEditor
              lines={productLines}
              disabled={!canEdit}
              onChange={(lines) => {
                setProductLines(lines)
                clearMetricFieldErrors()
                setSaveSuccess(false)
              }}
            />
            {(fieldErrors.skuLines ||
              fieldErrors.spend ||
              fieldErrors.gmv ||
              fieldErrors.orders) && (
              <div className="ads-sku-field-errors">
                <FieldError message={fieldErrors.skuLines} />
                <FieldError message={fieldErrors.spend} />
                <FieldError message={fieldErrors.gmv} />
                <FieldError message={fieldErrors.orders} />
              </div>
            )}
          </div>

          <div className="ads-summary-strip" aria-live="polite">
            <SummaryMetric
              label="Spend รวม"
              value={formatTotalDisplay(spendTotal)}
              error={fieldErrors.spend}
            />
            <SummaryMetric
              label="GMV รวม"
              value={formatTotalDisplay(gmvTotal)}
              error={fieldErrors.gmv}
            />
            <SummaryMetric
              label="ออเดอร์รวม"
              value={formatTotalDisplay(ordersTotal)}
              error={fieldErrors.orders}
            />
            <SummaryMetric label="ROI" value={roi != null ? roi.toFixed(2) : '—'} />
            <SummaryMetric label="CPA" value={cpa != null ? cpa.toFixed(2) : '—'} />
          </div>

          <label className="ads-report-full">
            คลิป/วิดีโอเด่น
            <input
              className="crm-input"
              value={topVideo}
              disabled={!canEdit}
              onChange={(e) => setTopVideo(e.target.value)}
              placeholder="ลิงก์หรือชื่อคลิป"
            />
          </label>

          <label className="ads-report-full">
            ปัญหาวันนี้
            <textarea
              rows={2}
              className="crm-input"
              value={issue}
              disabled={!canEdit}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="เช่น งบไม่พอ, CTR ตก"
            />
          </label>
          <label className="ads-report-full">
            แผนพรุ่งนี้
            <textarea
              rows={2}
              className="crm-input"
              value={nextPlan}
              disabled={!canEdit}
              onChange={(e) => setNextPlan(e.target.value)}
              placeholder="แผนปรับแคมเปญ / คอนเทนต์"
            />
          </label>

          {canEdit && (
            <div className="crm-form__actions">
              <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกรายงาน'}
              </button>
            </div>
          )}
        </form>
      </section>

      {history.length > 0 && (
        <section className="card card--wide">
          <h2 className="crm-section-title">7 วันล่าสุด</h2>
          <div className="crm-table-wrap ads-history-table">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เวลารายงาน</th>
                  <th>Spend</th>
                  <th>GMV</th>
                  <th>Orders</th>
                  <th>ROI</th>
                  <th>SKU</th>
                </tr>
              </thead>
              <tbody>
                {history.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <button
                        type="button"
                        className="crm-link-btn"
                        onClick={() => handleDateChange(m.report_date)}
                      >
                        {m.report_date}
                      </button>
                    </td>
                    <td className="ads-history-reported-at">
                      {m.reported_at ? formatReportTime(m.reported_at) : '—'}
                    </td>
                    <td>{m.spend.toLocaleString('th-TH')}</td>
                    <td>{m.gmv.toLocaleString('th-TH')}</td>
                    <td>{m.orders.toLocaleString('th-TH')}</td>
                    <td>{m.roi != null ? m.roi.toFixed(2) : '—'}</td>
                    <td className="ads-history-products">{metricProductsSummary(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
