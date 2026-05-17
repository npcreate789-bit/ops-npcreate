import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canManageContentJobs,
  canViewWorkHub,
  hasContentTeamView,
  isContentReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  canLinkCustomerClient,
  canLinkCustomerOnboarding,
  canViewCustomer360,
} from '../../customers/access'
import { clientWorkspaceUrl } from '../../customers/customerLinks'
import {
  getContentSummary,
  listContentAssignees,
  listContentJobs,
} from '../api/contentJobs'
import { ContentPipelineFilterBar } from '../components/ContentPipelineFilterBar'
import { ContentRoleGuide } from '../components/ContentRoleGuide'
import { ContentStatusBadge } from '../components/ContentStatusBadge'
import { contentFormatLabel, isContentOverdue } from '../constants'
import { matchesContentPipeline, type ContentPipelineFilter } from '../pipeline'
import type { ContentJob, ContentJobFilters, ContentJobSummary } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../content.css'
import '../../phase2/phase2.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function ContentListPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const teamView = hasContentTeamView(roles) || !configured
  const canManage = canManageContentJobs(roles) || !configured
  const readOnly = isContentReadOnly(roles) && configured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const show360 = canViewCustomer360(roles) || !configured

  const [rows, setRows] = useState<ContentJob[]>([])
  const [summary, setSummary] = useState<ContentJobSummary | null>(null)
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([])
  const [pipelineFilter, setPipelineFilter] = useState<ContentPipelineFilter>('all')
  const [filters, setFilters] = useState<ContentJobFilters>({
    scope: teamView ? 'all' : 'mine',
    status: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [jobs, sum, people] = await Promise.all([
        listContentJobs(userId, { ...filters, status: '' }, teamView),
        getContentSummary(userId, teamView, filters.scope),
        listContentAssignees(),
      ])
      setRows(jobs)
      setSummary(sum)
      setAssignees(people)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [userId, filters, teamView])

  useEffect(() => {
    void load()
  }, [load])

  const pipelineCounts = useMemo(() => {
    const counts: Partial<Record<ContentPipelineFilter, number>> = {
      all: rows.length,
      briefed: 0,
      in_production: 0,
      review: 0,
      overdue: 0,
      delivered: 0,
    }
    for (const row of rows) {
      if (row.status === 'briefed') counts.briefed = (counts.briefed ?? 0) + 1
      if (row.status === 'in_production') counts.in_production = (counts.in_production ?? 0) + 1
      if (row.status === 'review') counts.review = (counts.review ?? 0) + 1
      if (row.status === 'delivered') counts.delivered = (counts.delivered ?? 0) + 1
      if (isContentOverdue(row.due_at, row.status)) counts.overdue = (counts.overdue ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(
    () => rows.filter((r) => matchesContentPipeline(r, pipelineFilter)),
    [rows, pipelineFilter],
  )

  const overdueCount = summary?.overdue_count ?? pipelineCounts.overdue ?? 0

  function openJob(id: string) {
    navigate(`/app/content/${id}`)
  }

  return (
    <div className="page content-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>งานคอนเทนต์</h1>
          <p className="muted">
            ติดตามบรีฟ · ผลิต · ส่งมอบ — ลูกค้าเห็นไฟล์ที่ส่งแล้วในพื้นที่ลูกค้า
          </p>
        </div>
        <div className="content-page__header-actions">
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
            <Link to="/app/client" className="crm-btn crm-btn--ghost">
              พื้นที่ลูกค้า
            </Link>
          )}
          {canManage && (
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => navigate('/app/content/new')}
            >
              + งานใหม่
            </button>
          )}
        </div>
      </header>

      <ContentRoleGuide />

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — บทบาทของคุณไม่สามารถสร้างหรือแก้ไขงานคอนเทนต์ได้
        </p>
      )}

      {overdueCount > 0 && pipelineFilter !== 'overdue' && (
        <div className="content-hint-banner" role="status">
          <p>
            มี <strong>{overdueCount}</strong> งานเกินกำหนดส่ง
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setPipelineFilter('overdue')}
          >
            ดูงานเกินกำหนด
          </button>
        </div>
      )}

      {summary && (
        <section className="card-grid content-kpi-grid">
          <article className="card">
            <h2>รับบรีฟ</h2>
            <p className="stat">{summary.open_count}</p>
          </article>
          <article className="card">
            <h2>กำลังผลิต</h2>
            <p className="stat">{summary.in_production_count}</p>
          </article>
          <article className="card">
            <h2>รอตรวจ</h2>
            <p className="stat">{summary.review_count}</p>
          </article>
          <article className="card card--accent">
            <h2>เกินกำหนด</h2>
            <p className="stat">{summary.overdue_count}</p>
          </article>
        </section>
      )}

      <ContentPipelineFilterBar
        active={pipelineFilter}
        onSelect={setPipelineFilter}
        counts={pipelineCounts}
      />

      <section className="card card--wide">
        <div className="content-filters crm-form__grid">
          {teamView && (
            <label>
              มุมมอง
              <select
                className="crm-select"
                style={{ width: '100%', minWidth: 0 }}
                value={filters.scope ?? 'all'}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    scope: e.target.value as 'mine' | 'all',
                  }))
                }
              >
                <option value="all">ทั้งทีม</option>
                <option value="mine">งานของฉัน</option>
              </select>
            </label>
          )}
          {teamView && filters.scope === 'all' && (
            <label>
              ผู้รับผิดชอบ
              <select
                className="crm-select"
                style={{ width: '100%', minWidth: 0 }}
                value={filters.assignee_id ?? ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    assignee_id: e.target.value || undefined,
                  }))
                }
              >
                <option value="">ทุกคน</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="content-filters__refresh">
            <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
              รีเฟรช
            </button>
          </div>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">
            ยังไม่มีงานคอนเทนต์ — {canManage ? 'กด「งานใหม่」เพื่อเริ่ม' : 'รอทีม Content สร้างงาน'}
          </p>
        )}

        {!loading && rows.length > 0 && displayedRows.length === 0 && (
          <p className="muted">ไม่พบงานในตัวกรองนี้</p>
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable content-table">
              <thead>
                <tr>
                  <th>งาน</th>
                  <th>ลูกค้า</th>
                  <th>รูปแบบ</th>
                  <th>สถานะ</th>
                  <th>กำหนดส่ง</th>
                  <th className="content-table__actions-head">ลิงก์ด่วน</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      isContentOverdue(row.due_at, row.status) ? 'content-row--overdue' : undefined
                    }
                    onClick={() => openJob(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openJob(row.id)
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td>
                      <strong>{row.title}</strong>
                      {row.assignee_name && (
                        <span className="crm-sub">{row.assignee_name}</span>
                      )}
                    </td>
                    <td>{row.customer_brand_name ?? '—'}</td>
                    <td>{contentFormatLabel(row.format)}</td>
                    <td>
                      <ContentStatusBadge status={row.status} />
                    </td>
                    <td>{row.due_at ? formatBangkokDateTime(row.due_at) : '—'}</td>
                    <td className="content-table__actions">
                      <Link
                        to={`/app/content/${row.id}`}
                        className="content-table__link content-table__link--primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        เปิด
                      </Link>
                      {showOnboarding && (
                        <Link
                          to={`/app/onboarding/${row.customer_id}`}
                          className="content-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          บรีฟ
                        </Link>
                      )}
                      {show360 && (
                        <Link
                          to={`/app/customers/${row.customer_id}`}
                          className="content-table__link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          360°
                        </Link>
                      )}
                      {showClient && (
                        <Link
                          to={clientWorkspaceUrl(row.customer_id)}
                          className="content-table__link"
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
