import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { getTaskSummary, listAssignees, listTasks } from '../api/tasks'
import { TaskPriorityBadge } from '../components/TaskPriorityBadge'
import { TaskStatusBadge } from '../components/TaskStatusBadge'
import { isTaskOverdue, TASK_STATUS_OPTIONS } from '../constants'
import type { Task, TaskFilters, TaskSummary } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../tasks.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function TasksPage() {
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const teamView = hasTasksTeamView(roles) || !configured

  const [rows, setRows] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([])
  const [filters, setFilters] = useState<TaskFilters>({
    scope: teamView ? 'all' : 'mine',
    status: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasks, sum, people] = await Promise.all([
        listTasks(userId, filters, teamView),
        getTaskSummary(userId, teamView),
        listAssignees(),
      ])
      setRows(tasks)
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
      <header className="page__header sales-page__header">
        <div>
          <h1>งานภายใน</h1>
          <p>มอบหมาย ติดตามสถานะ และงานที่ค้างเกินกำหนด</p>
        </div>
        <Link to="/app/tasks/new" className="crm-btn crm-btn--primary">
          + สร้างงาน
        </Link>
      </header>

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {summary && (
        <section className="card-grid">
          <article className="card card--accent">
            <h2>งานเปิดอยู่</h2>
            <p className="stat">{summary.open_count}</p>
          </article>
          <article className="card">
            <h2>ติดขัด</h2>
            <p className="stat">{summary.blocked_count}</p>
          </article>
          <article className="card">
            <h2>เกินกำหนด</h2>
            <p className="stat">{summary.overdue_count}</p>
          </article>
          <article className="card">
            <h2>เสร็จสัปดาห์นี้</h2>
            <p className="stat">{summary.done_this_week}</p>
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
                  status: e.target.value as TaskFilters['status'],
                }))
              }
            >
              <option value="">ทั้งหมด</option>
              {TASK_STATUS_OPTIONS.map((o) => (
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

        {!loading && rows.length === 0 && <p className="muted">ยังไม่มีงาน</p>}

        {!loading && rows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable">
              <thead>
                <tr>
                  <th>งาน</th>
                  <th>ลูกค้า</th>
                  <th>ผู้รับผิดชอบ</th>
                  <th>ความสำคัญ</th>
                  <th>สถานะ</th>
                  <th>กำหนดเสร็จ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const overdue = isTaskOverdue(row.due_at, row.status)
                  return (
                    <tr
                      key={row.id}
                      className={overdue ? 'task-row--overdue' : undefined}
                      onClick={() => navigate(`/app/tasks/${row.id}`)}
                    >
                      <td>
                        <strong>{row.title}</strong>
                      </td>
                      <td>
                        {row.customer_id && row.customer_brand_name ? (
                          <Link
                            to={`/app/onboarding/${row.customer_id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.customer_brand_name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{row.assignee_name ?? '—'}</td>
                      <td>
                        <TaskPriorityBadge priority={row.priority} />
                      </td>
                      <td>
                        <TaskStatusBadge status={row.status} />
                      </td>
                      <td className={overdue ? 'ads-roi-warn' : undefined}>
                        {formatBangkokDateTime(row.due_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
