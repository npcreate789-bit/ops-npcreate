import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canAccessNotifications } from '../../../../shared/auth/access'
import { formatBangkokDate, formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  canOpenWorkItemLink,
  canViewWorkHub,
  hasWorkHubKinds,
  isWorkHubScoped,
  scopedWorkKindLabels,
  workKindOptionsForRoles,
} from '../access'
import { buildWorkHubSummary, fetchWorkHub } from '../api/workHub'
import {
  DEFAULT_WORK_HUB_FILTERS,
  WORK_LOOKBACK_OPTIONS,
  WORK_WITHIN_OPTIONS,
  workKindLabel,
} from '../constants'
import type { WorkHubFilters, WorkItem } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../../timeline/timeline.css'
import '../work-hub.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function formatWhen(at: string): string {
  return at.length > 10 ? formatBangkokDateTime(at) : formatBangkokDate(at)
}

function WorkItemRow({
  item,
  linkable,
}: {
  item: WorkItem
  linkable: boolean
}) {
  const body = (
    <>
      <span className="timeline-item__kind">{workKindLabel(item.kind)}</span>
      <p className="timeline-item__title">
        <strong>{item.title}</strong>
      </p>
      <p className="timeline-item__detail">{item.detail}</p>
    </>
  )

  if (linkable) {
    return (
      <Link to={item.link} className="timeline-item__link">
        {body}
      </Link>
    )
  }

  return (
    <div className="timeline-item__static" aria-disabled="true">
      {body}
      <span className="work-hub__locked">ไม่มีสิทธิ์เปิดรายละเอียด</span>
    </div>
  )
}

export function WorkHubPage() {
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const allowed = canViewWorkHub(roles) || !configured
  const hasKinds = hasWorkHubKinds(roles) || !configured
  const scoped = isWorkHubScoped(roles) && configured
  const showNotifLink = canAccessNotifications(roles) || !configured
  const kindOptions = useMemo(() => workKindOptionsForRoles(roles), [roles])
  const scopedLabel = useMemo(
    () => scopedWorkKindLabels(roles, workKindLabel),
    [roles],
  )

  const [filters, setFilters] = useState<WorkHubFilters>(DEFAULT_WORK_HUB_FILTERS)
  const [rows, setRows] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const summary = useMemo(() => buildWorkHubSummary(rows), [rows])

  useEffect(() => {
    if (!filters.kind || kindOptions.some((o) => o.value === filters.kind)) return
    setFilters((f) => ({ ...f, kind: '' }))
  }, [filters.kind, kindOptions])

  const load = useCallback(async () => {
    if (!allowed || !hasKinds) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setRows(await fetchWorkHub(userId, roles, filters, configured))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [allowed, configured, filters, hasKinds, roles, userId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!allowed || !hasKinds) {
        if (!cancelled) {
          setRows([])
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchWorkHub(userId, roles, filters, configured)
        if (!cancelled) setRows(data)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
          setRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [allowed, configured, filters, hasKinds, roles, userId])

  if (!allowed) {
    return (
      <div className="page">
        <h1>งานของฉัน</h1>
        <p className="crm-error">บทบาท client อย่างเดียวไม่มีสิทธิ์ดูศูนย์งานนี้</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>งานของฉัน</h1>
          <p className="muted">
            งานค้าง นัดติดตาม สัญญา การเงิน และแจ้งเตือน — เรียงตามความเร่งด่วน
          </p>
        </div>
        <div className="work-hub__actions">
          {showNotifLink && (
            <Link to="/app/notifications" className="crm-btn crm-btn--ghost">
              จัดการแจ้งเตือน
            </Link>
          )}
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
            รีเฟรช
          </button>
        </div>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {configured && !hasKinds && (
        <p className="crm-error">ไม่มีประเภทงานที่แสดงได้สำหรับบทบาทนี้</p>
      )}

      {scoped && hasKinds && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          แสดงเฉพาะ: {scopedLabel}
        </p>
      )}

      <section className="card card--wide">
        <div className="task-filters work-hub__filters">
          <label className="task-field">
            <span className="task-field__label">มุมมอง</span>
            <select
              className="task-select"
              value={filters.view}
              disabled={!hasKinds}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  view: e.target.value as WorkHubFilters['view'],
                }))
              }
            >
              <option value="all">ทั้งหมด</option>
              <option value="overdue">เลยกำหนด</option>
              <option value="today">วันนี้</option>
            </select>
          </label>
          <label className="task-field">
            <span className="task-field__label">ล่วงหน้า</span>
            <select
              className="task-select"
              value={filters.within_days}
              disabled={!hasKinds}
              onChange={(e) =>
                setFilters((f) => ({ ...f, within_days: Number(e.target.value) }))
              }
            >
              {WORK_WITHIN_OPTIONS.map((o) => (
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
              disabled={!hasKinds}
              onChange={(e) =>
                setFilters((f) => ({ ...f, lookback_days: Number(e.target.value) }))
              }
            >
              {WORK_LOOKBACK_OPTIONS.map((o) => (
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
              disabled={!hasKinds}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  kind: e.target.value as WorkHubFilters['kind'],
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

        {!loading && hasKinds && (
          <div className="timeline-summary work-hub__summary" aria-live="polite">
            <span className="timeline-summary__item">
              <strong>{summary.total}</strong> รายการ
            </span>
            <span className="timeline-summary__item timeline-summary__item--warn">
              <strong>{summary.overdue}</strong> เลยกำหนด
            </span>
            <span className="timeline-summary__item">
              <strong>{summary.due_today}</strong> วันนี้
            </span>
            {summary.unread_notifications > 0 && (
              <span className="timeline-summary__item">
                <strong>{summary.unread_notifications}</strong> แจ้งเตือน
              </span>
            )}
          </div>
        )}

        {error && (
          <p className="crm-error" role="alert">
            {error}
          </p>
        )}
        {loading && hasKinds && <p className="muted">กำลังโหลด...</p>}

        {!loading && hasKinds && rows.length === 0 && (
          <p className="muted">
            ไม่มีงานในช่วงที่เลือก — ลองขยายช่วงเวลาหรือเปลี่ยนมุมมอง
            {showNotifLink && (
              <>
                {' '}
                · <Link to="/app/notifications">จัดการแจ้งเตือน</Link>
              </>
            )}
          </p>
        )}

        {!loading && rows.length > 0 && (
          <ul className="timeline-list work-hub__list">
            {rows.map((row) => {
              const linkable = !configured || canOpenWorkItemLink(roles, row.link)
              return (
                <li
                  key={row.id}
                  className={`timeline-item${row.overdue ? ' timeline-item--overdue' : ''}${
                    row.kind === 'notification' ? ' work-hub__item--notif' : ''
                  }`}
                >
                  <div className="timeline-item__date">{formatWhen(row.at)}</div>
                  <WorkItemRow item={row} linkable={linkable} />
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
