import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  canOpenCustomerTimelineLink,
  customer360TimelineKindsForContext,
  hasCustomer360TimelineKinds,
  isCustomer360TimelineScoped,
} from '../access'
import {
  buildCustomerTimelineSummary,
  fetchCustomerTimeline,
} from '../api/customerTimeline'
import {
  CUSTOMER_TIMELINE_KIND_OPTIONS,
  CUSTOMER_TIMELINE_LOOKBACK_OPTIONS,
  CUSTOMER_TIMELINE_WITHIN_OPTIONS,
  customerTimelineKindLabel,
} from '../constants'
import type { CustomerTimelineContext, CustomerTimelineFilters } from '../types'
import '../../timeline/timeline.css'
import '../customers.css'

function formatWhen(at: string): string {
  return at.length > 10 ? formatBangkokDateTime(at) : formatBangkokDate(at)
}

interface CustomerTimelineSectionProps {
  context: CustomerTimelineContext
}

export function CustomerTimelineSection({ context }: CustomerTimelineSectionProps) {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const hasKinds = hasCustomer360TimelineKinds(roles, context.leadId) || !configured
  const scoped = isCustomer360TimelineScoped(roles, context.leadId) && configured
  const kindOptions = useMemo(() => {
    const allowed = new Set(customer360TimelineKindsForContext(roles, context.leadId))
    return CUSTOMER_TIMELINE_KIND_OPTIONS.filter((o) => !o.value || allowed.has(o.value))
  }, [roles, context.leadId])

  const [filters, setFilters] = useState<CustomerTimelineFilters>({
    within_days: 30,
    lookback_days: 90,
    kind: '',
  })
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchCustomerTimeline>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const scopedLabels = useMemo(
    () =>
      customer360TimelineKindsForContext(roles, context.leadId)
        .map(customerTimelineKindLabel)
        .join(' · '),
    [roles, context.leadId],
  )

  const summary = useMemo(() => buildCustomerTimelineSummary(rows), [rows])

  useEffect(() => {
    if (!filters.kind || kindOptions.some((o) => o.value === filters.kind)) return
    setFilters((f) => ({ ...f, kind: '' }))
  }, [filters.kind, kindOptions])

  const load = useCallback(() => {
    if (!hasKinds) {
      setRows([])
      setLoading(false)
      setError(null)
      return () => undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchCustomerTimeline(context, roles, filters)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'โหลดไทม์ไลน์ไม่สำเร็จ')
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [context, filters, hasKinds, roles, reloadKey])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  if (!hasKinds && configured) {
    return (
      <section className="card card--wide customer-timeline">
        <h2>ไทม์ไลน์ลูกค้า</h2>
        <p className="muted">บทบาทของคุณไม่มีสิทธิ์ดูเหตุการณ์ในไทม์ไลน์นี้</p>
      </section>
    )
  }

  return (
    <section className="card card--wide customer-timeline">
      <header className="customer-timeline__header">
        <div>
          <h2>ไทม์ไลน์ลูกค้า</h2>
          <p className="muted">งาน การเงิน คอนเทนต์ สัญญา — ตามสิทธิ์และ RLS</p>
        </div>
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          disabled={loading}
          onClick={() => setReloadKey((k) => k + 1)}
        >
          รีเฟรช
        </button>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {scoped && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          แสดงเฉพาะ: {scopedLabels} — เหตุการณ์ถูกกรองตามเมนูและ RLS
        </p>
      )}

      <div className="task-filters">
        <label className="task-field">
          <span className="task-field__label">ประเภท</span>
          <select
            className="task-select"
            value={filters.kind}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                kind: e.target.value as CustomerTimelineFilters['kind'],
              }))
            }
          >
            {kindOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">ล่วงหน้า</span>
          <select
            className="task-select"
            value={filters.within_days}
            onChange={(e) =>
              setFilters((f) => ({ ...f, within_days: Number(e.target.value) }))
            }
          >
            {CUSTOMER_TIMELINE_WITHIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">ย้อนหลัง</span>
          <select
            className="task-select"
            value={filters.lookback_days}
            onChange={(e) =>
              setFilters((f) => ({ ...f, lookback_days: Number(e.target.value) }))
            }
          >
            {CUSTOMER_TIMELINE_LOOKBACK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="crm-error" role="alert">{error}</p>}
      {loading && <p className="muted" aria-live="polite">กำลังโหลดไทม์ไลน์...</p>}

      {!loading && !error && (
        <p className="customer-timeline-summary muted" aria-live="polite">
          {summary.total > 0
            ? `พบ ${summary.total} เหตุการณ์${summary.overdue > 0 ? ` · เลยกำหนด ${summary.overdue}` : ''}`
            : 'ไม่มีเหตุการณ์ในช่วงเวลาที่เลือก'}
        </p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="timeline-list">
          {rows.map((item) => {
            const linkable = !configured || canOpenCustomerTimelineLink(roles, item.href)
            const body = (
              <>
                <span className={`timeline-item__kind timeline-item__kind--${item.kind}`}>
                  {customerTimelineKindLabel(item.kind)}
                </span>
                <strong>{item.title}</strong>
                {item.detail && <span className="muted">{item.detail}</span>}
              </>
            )
            return (
              <li
                key={item.id}
                className={`timeline-item${item.overdue ? ' timeline-item--overdue' : ''}`}
              >
                <time className="timeline-item__date" dateTime={item.at}>
                  {formatWhen(item.at)}
                </time>
                <div className="timeline-item__body">
                  {linkable ? (
                    <Link to={item.href} className="timeline-item__link">
                      {body}
                    </Link>
                  ) : (
                    <div className="timeline-item__static">
                      {body}
                      <span className="timeline-item__locked">ไม่มีสิทธิ์เปิดรายละเอียด</span>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
