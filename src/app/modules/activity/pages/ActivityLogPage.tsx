import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { canAccessNavPath } from '../../../config/navigation'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canUseGlobalSearch,
  canViewActivityLog,
  canViewAdminAudit,
  canViewCustomer360,
  canViewReports,
  canViewWeeklyReport,
} from '../../../../shared/auth/access'
import {
  AUDIT_ACTION_GROUPS,
  auditActionLabel,
  formatAuditMetadata,
} from '../../../../shared/audit/actionLabels'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { downloadCsv } from '../../../../shared/export/csv'
import { canViewSensitiveAudit } from '../access'
import {
  activityEntityTypes,
  listActivityActors,
  listActivityLogs,
} from '../api/activityLogs'
import { ActivityCategoryFilterBar } from '../components/ActivityCategoryFilterBar'
import { ActivityRoleGuide } from '../components/ActivityRoleGuide'
import {
  activityCustomerId,
  activityEntityHref,
  activityEntityLabel,
} from '../entityLinks'
import { ACTIVITY_CATEGORY_ALL, countActivityByCategory } from '../pipeline'
import { EMPTY_ACTIVITY_FILTERS, type ActivityFilters } from '../types'
import '../../crm/crm.css'
import '../../tasks/tasks.css'
import '../../phase2/phase2.css'
import '../activity.css'

const SEARCH_DEBOUNCE_MS = 320

export function ActivityLogPage() {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const isCeo = roles.includes('ceo')
  const canView = canViewActivityLog(roles) || !configured
  const isAdminAudit = canViewAdminAudit(roles) || !configured
  const sensitiveHidden = configured && !canViewSensitiveAudit(roles)
  const showCustomers = canViewCustomer360(roles) || !configured
  const showWeekly = canViewWeeklyReport(roles) || !configured
  const showReports = canViewReports(roles) || !configured
  const showSearch = canUseGlobalSearch(roles) || !configured

  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_ACTIVITY_FILTERS)
  const [categoryFilter, setCategoryFilter] = useState(ACTIVITY_CATEGORY_ALL)
  const [searchInput, setSearchInput] = useState('')
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listActivityLogs>>>([])
  const [categoryCounts, setCategoryCounts] = useState<
    Partial<Record<string, number>>
  >({})
  const [entityTypes, setEntityTypes] = useState<string[]>([])
  const [actors, setActors] = useState<Awaited<ReturnType<typeof listActivityActors>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!canView) return
    listActivityActors()
      .then(setActors)
      .catch(() => setActors([]))
  }, [canView])

  useEffect(() => {
    if (!canView) return
    listActivityLogs(EMPTY_ACTIVITY_FILTERS, roles)
      .then((all) => {
        setEntityTypes(activityEntityTypes(all))
        setCategoryCounts(countActivityByCategory(all))
      })
      .catch(() => {
        setEntityTypes([])
        setCategoryCounts({})
      })
  }, [canView, roles])

  const load = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    setError(null)
    try {
      setRows(await listActivityLogs(filters, roles))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [canView, filters, roles])

  useEffect(() => {
    void load()
  }, [load])

  function selectCategory(value: string) {
    setCategoryFilter(value)
    setFilters((f) => ({ ...f, action_prefix: value }))
  }

  function clearFilters() {
    setSearchInput('')
    setCategoryFilter(ACTIVITY_CATEGORY_ALL)
    setFilters(EMPTY_ACTIVITY_FILTERS)
  }

  const visibleGroups = useMemo(
    () =>
      AUDIT_ACTION_GROUPS.filter((g) =>
        sensitiveHidden ? g.value !== 'user' && g.value !== 'client_access' : true,
      ),
    [sensitiveHidden],
  )

  if (!canView) {
    return (
      <div className="page">
        <h1>บันทึกกิจกรรม</h1>
        <p className="crm-error">ไม่มีสิทธิ์ดูบันทึกกิจกรรม</p>
      </div>
    )
  }

  const hasFilters =
    filters.entity_type ||
    filters.actor_id ||
    filters.date_from ||
    filters.date_to ||
    filters.action_prefix ||
    filters.search.trim()

  return (
    <div className="page activity-page">
      <header className="page__header crm-page__header phase2-page__header">
        <div>
          <h1>บันทึกกิจกรรม</h1>
          <p className="muted">
            {isCeo
              ? 'ติดตามการทำงานของทีม — ใครทำอะไร กับข้อมูลใด เมื่อไหร่'
              : 'ประวัติการเปลี่ยนแปลงสำคัญในระบบ — อ่านอย่างเดียว'}
          </p>
        </div>
        <div className="activity-page__header-actions">
          <Link to="/app/dashboard" className="crm-btn crm-btn--ghost">
            แดชบอร์ด
          </Link>
          {showSearch && (
            <Link to="/app/search" className="crm-btn crm-btn--ghost">
              ค้นหารวม
            </Link>
          )}
          {isAdminAudit && (
            <Link to="/app/admin/logs" className="crm-btn crm-btn--ghost">
              Audit ผู้ดูแล
            </Link>
          )}
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv(
                'activity-log',
                ['เวลา', 'การกระทำ', 'ประเภท', 'entity_id', 'รายละเอียด', 'ผู้ทำ'],
                rows.map((row) => [
                  formatBangkokDateTime(row.created_at),
                  auditActionLabel(row.action),
                  activityEntityLabel(row.entity_type),
                  row.entity_id ?? '',
                  formatAuditMetadata(row.metadata),
                  row.actor_name ?? row.actor_email ?? '',
                ]),
              )
            }
          >
            ส่งออก CSV
          </button>
          <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
            รีเฟรช
          </button>
        </div>
      </header>

      <ActivityRoleGuide showAdminAudit={isAdminAudit} />

      {(showWeekly || showReports) && (
        <div className="activity-hint-banner">
          <p>
            ต้องการสรุปตัวเลข
            {showReports ? (
              <>
                {' '}
                → <Link to="/app/reports">รายงานรายเดือน</Link>
              </>
            ) : null}
            {showWeekly ? (
              <>
                {' '}
                → <Link to="/app/weekly">สรุปรายสัปดาห์</Link>
              </>
            ) : null}
          </p>
        </div>
      )}

      {!configured && (
        <p className="crm-banner crm-banner--warn">โหมดพัฒนา — ข้อมูลตัวอย่าง</p>
      )}

      {sensitiveHidden && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          ซ่อนบันทึกผู้ใช้และพอร์ทัลลูกค้า — ผู้ดูแลระบบดูได้ครบที่ Audit ผู้ดูแล
        </p>
      )}

      <section className="card card--wide">
        <ActivityCategoryFilterBar
          active={categoryFilter}
          onSelect={selectCategory}
          counts={categoryCounts}
          hideSensitive={sensitiveHidden}
        />

        <div className="task-filters activity-filters">
          <label className="task-field">
            <span className="task-field__label">พนักงาน</span>
            <select
              className="task-select crm-select"
              value={filters.actor_id}
              onChange={(e) => setFilters((f) => ({ ...f, actor_id: e.target.value }))}
            >
              <option value="">ทุกคน</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field">
            <span className="task-field__label">หมวด (ละเอียด)</span>
            <select
              className="task-select crm-select"
              value={filters.action_prefix}
              onChange={(e) => {
                const value = e.target.value
                setCategoryFilter(value)
                setFilters((f) => ({ ...f, action_prefix: value }))
              }}
            >
              {visibleGroups.map((g) => (
                <option key={g.value || 'all'} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field">
            <span className="task-field__label">ประเภทข้อมูล</span>
            <select
              className="task-select crm-select"
              value={filters.entity_type}
              onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
            >
              <option value="">ทั้งหมด</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {activityEntityLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="task-field">
            <span className="task-field__label">ตั้งแต่</span>
            <input
              type="date"
              className="crm-input"
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
            />
          </label>
          <label className="task-field">
            <span className="task-field__label">ถึง</span>
            <input
              type="date"
              className="crm-input"
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
            />
          </label>
          <label className="task-field task-field--grow">
            <span className="task-field__label">ค้นหา</span>
            <input
              className="crm-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ชื่อแบรนด์, ผู้ทำ, รายละเอียด..."
            />
          </label>
          {hasFilters && (
            <button type="button" className="crm-btn crm-btn--ghost" onClick={clearFilters}>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted activity-empty">
            {hasFilters
              ? 'ยังไม่มีบันทึกที่ตรงกับตัวกรอง'
              : 'ยังไม่มีบันทึก — การบันทึกจาก CRM, การเงิน, งาน ฯลฯ จะปรากฏที่นี่อัตโนมัติ'}
          </p>
        )}

        {!loading && rows.length > 0 && (
          <>
            <p className="muted activity-count">
              แสดง {rows.length} รายการ (ล่าสุดไม่เกิน 200)
              {categoryFilter
                ? ` · หมวด ${visibleGroups.find((g) => g.value === categoryFilter)?.label ?? categoryFilter}`
                : ''}
            </p>
            <div className="crm-table-wrap">
              <table className="crm-table activity-table">
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>ผู้ทำ</th>
                    <th>การกระทำ</th>
                    <th>ข้อมูล</th>
                    <th>รายละเอียด</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const meta = formatAuditMetadata(row.metadata)
                    const href = activityEntityHref(row)
                    const customerId = activityCustomerId(row)
                    const customerHref =
                      customerId && showCustomers
                        ? `/app/customers/${customerId}`
                        : null
                    const canOpenEntity =
                      href && (!configured || canAccessNavPath(roles, href))
                    const canOpenCustomer =
                      customerHref &&
                      customerHref !== href &&
                      (!configured || canAccessNavPath(roles, customerHref))

                    return (
                      <tr key={row.id}>
                        <td>{formatBangkokDateTime(row.created_at)}</td>
                        <td>
                          {row.actor_name ?? row.actor_email ?? '—'}
                          {row.actor_email && row.actor_name && (
                            <span className="activity-meta">
                              <br />
                              {row.actor_email}
                            </span>
                          )}
                        </td>
                        <td>{auditActionLabel(row.action)}</td>
                        <td>
                          <strong>{activityEntityLabel(row.entity_type)}</strong>
                          {row.entity_id && (
                            <span className="activity-meta">
                              <br />
                              {row.entity_id.slice(0, 8)}…
                            </span>
                          )}
                        </td>
                        <td className="activity-meta-cell">
                          {meta || <span className="muted">—</span>}
                        </td>
                        <td className="activity-actions-cell">
                          {canOpenEntity && (
                            <Link to={href!} className="crm-btn crm-btn--ghost activity-open-btn">
                              เปิด
                            </Link>
                          )}
                          {canOpenCustomer && (
                            <Link
                              to={customerHref!}
                              className="crm-btn crm-btn--ghost activity-open-btn"
                            >
                              360°
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
