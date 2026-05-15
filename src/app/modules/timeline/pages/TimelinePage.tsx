import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewTimeline } from '../../../../shared/auth/access'
import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  isTimelineScoped,
  timelineKindOptionsForRoles,
} from '../access'
import { buildTimelineSummary, fetchTimeline } from '../api/timeline'
import {
  TIMELINE_LOOKBACK_OPTIONS,
  TIMELINE_WITHIN_OPTIONS,
  timelineKindLabel,
} from '../constants'
import type { TimelineFilters } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../timeline.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatWhen(at: string): string {
  return at.length > 10 ? formatBangkokDateTime(at) : formatBangkokDate(at)
}

export function TimelinePage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const canView = canViewTimeline(roles) || !configured
  const scoped = isTimelineScoped(roles) && configured
  const kindOptions = useMemo(() => timelineKindOptionsForRoles(roles), [roles])

  const [filters, setFilters] = useState<TimelineFilters>({
    within_days: 30,
    lookback_days: 30,
    kind: '',
  })
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchTimeline>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const summary = useMemo(() => buildTimelineSummary(rows), [rows])

  useEffect(() => {
    if (!filters.kind || kindOptions.some((o) => o.value === filters.kind)) return
    setFilters((f) => ({ ...f, kind: '' }))
  }, [filters.kind, kindOptions])

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchTimeline(userId, roles, filters))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [canView, userId, roles, filters])

  useEffect(() => {
    void load()
  }, [load])

  if (!canView) {
    return (
      <div className="page">
        <h1>ไทม์ไลน์งาน</h1>
        <p className="crm-error">บทบาทของคุณไม่มีสิทธิ์ดูไทม์ไลน์นี้</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>ไทม์ไลน์งาน</h1>
          <p className="muted">
            งาน สัญญา นัดติดตาม Lead และครบกำหนดชำระ — รวมจากข้อมูลในระบบตามสิทธิ์ของคุณ
          </p>
        </div>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
          รีเฟรช
        </button>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {scoped && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          แสดงเฉพาะประเภทที่บทบาทของคุณเข้าถึงได้ — รายการถูกกรองตาม RLS ในระบบ
        </p>
      )}

      <section className="card card--wide">
        <div className="task-filters">
          <label className="task-field">
            <span className="task-field__label">ล่วงหน้า</span>
            <select
              className="task-select"
              value={filters.within_days}
              onChange={(e) =>
                setFilters((f) => ({ ...f, within_days: Number(e.target.value) }))
              }
            >
              {TIMELINE_WITHIN_OPTIONS.map((o) => (
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
              {TIMELINE_LOOKBACK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field">
            <span className="task-field__label">ประเภท</span>
            <select
              className="task-select"
              value={filters.kind}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  kind: e.target.value as TimelineFilters['kind'],
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
        </div>

        {!loading && (
          <div className="timeline-summary">
            <span className="timeline-summary__item">
              <strong>{summary.total}</strong> รายการ
            </span>
            <span className="timeline-summary__item timeline-summary__item--warn">
              <strong>{summary.overdue}</strong> เลยกำหนด
            </span>
            <span className="timeline-summary__item">
              <strong>{summary.due_today}</strong> วันนี้
            </span>
          </div>
        )}

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">ไม่มีรายการในช่วงที่เลือก</p>
        )}

        {!loading && rows.length > 0 && (
          <ul className="timeline-list">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`timeline-item${row.overdue ? ' timeline-item--overdue' : ''}`}
              >
                <div className="timeline-item__date">{formatWhen(row.at)}</div>
                <div>
                  <span className="timeline-item__kind">{timelineKindLabel(row.kind)}</span>
                  <p className="timeline-item__title">
                    <Link to={row.link}>{row.title}</Link>
                  </p>
                  <p className="timeline-item__detail">{row.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
