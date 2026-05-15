import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canManageContentJobs,
  hasContentTeamView,
  isContentReadOnly,
} from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  getContentSummary,
  listContentAssignees,
  listContentJobs,
} from '../api/contentJobs'
import { ContentStatusBadge } from '../components/ContentStatusBadge'
import {
  CONTENT_STATUS_OPTIONS,
  contentFormatLabel,
  isContentOverdue,
} from '../constants'
import type { ContentJob, ContentJobFilters, ContentJobSummary } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../../tasks/tasks.css'
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

  const [rows, setRows] = useState<ContentJob[]>([])
  const [summary, setSummary] = useState<ContentJobSummary | null>(null)
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([])
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
        listContentJobs(userId, filters, teamView),
        getContentSummary(userId, teamView),
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

  return (
    <div className="page">
      <header className="page__header crm-page__header">
        <div>
          <h1>งานคอนเทนต์</h1>
          <p className="muted">ติดตามบรีฟ การผลิต และส่งมอบคลิป/กราฟิก</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            onClick={() => navigate('/app/content/new')}
          >
            + งานใหม่
          </button>
        )}
      </header>

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — บทบาทของคุณไม่สามารถสร้างหรือแก้ไขงานคอนเทนต์ได้
        </p>
      )}

      {summary && (
        <section className="card-grid">
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
          <article className="card">
            <h2>เกินกำหนด</h2>
            <p className="stat">{summary.overdue_count}</p>
          </article>
        </section>
      )}

      <section className="card card--wide">
        <div className="task-filters">
          {teamView && (
            <label className="task-field">
              <span className="task-field__label">มุมมอง</span>
              <select
                className="task-select"
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
          <label className="task-field">
            <span className="task-field__label">สถานะ</span>
            <select
              className="task-select"
              value={filters.status ?? ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: e.target.value as ContentJobFilters['status'],
                }))
              }
            >
              <option value="">ทั้งหมด</option>
              {CONTENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {teamView && filters.scope === 'all' && (
            <label className="task-field">
              <span className="task-field__label">ผู้รับผิดชอบ</span>
              <select
                className="task-select"
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
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && <p className="muted">ยังไม่มีงานคอนเทนต์</p>}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>งาน</th>
                  <th>ลูกค้า</th>
                  <th>รูปแบบ</th>
                  <th>สถานะ</th>
                  <th>กำหนดส่ง</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      isContentOverdue(row.due_at, row.status) ? 'content-row--overdue' : undefined
                    }
                  >
                    <td>
                      <Link to={`/app/content/${row.id}`}>{row.title}</Link>
                      {row.assignee_name && (
                        <>
                          <br />
                          <small className="muted">{row.assignee_name}</small>
                        </>
                      )}
                    </td>
                    <td>{row.customer_brand_name ?? '—'}</td>
                    <td>{contentFormatLabel(row.format)}</td>
                    <td>
                      <ContentStatusBadge status={row.status} />
                    </td>
                    <td>{formatBangkokDateTime(row.due_at)}</td>
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
