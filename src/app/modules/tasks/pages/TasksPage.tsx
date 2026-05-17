import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewWorkHub, hasTasksTeamView } from '../../../../shared/auth/access'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import {
  canLinkCustomerChat,
  canLinkCustomerClient,
  canLinkCustomerOnboarding,
  canViewCustomer360,
} from '../../customers/access'
import {
  chatUrlForCustomer,
  clientWorkspaceUrl,
} from '../../customers/customerLinks'
import { getTaskSummary, listAssignees, listTasks } from '../api/tasks'
import { TasksPipelineFilterBar } from '../components/TasksPipelineFilterBar'
import { TasksRoleGuide } from '../components/TasksRoleGuide'
import { TaskPriorityBadge } from '../components/TaskPriorityBadge'
import { TaskStatusBadge } from '../components/TaskStatusBadge'
import { isTaskOverdue } from '../constants'
import { matchesTaskPipeline, type TaskPipelineFilter } from '../pipeline'
import type { Task, TaskFilters, TaskSummary } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../tasks.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function TasksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectFilter = searchParams.get('project') ?? undefined
  const customerFilter = searchParams.get('customer') ?? undefined
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const teamView = hasTasksTeamView(roles) || !configured
  const showWorkLink = canViewWorkHub(roles) || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const show360 = canViewCustomer360(roles) || !configured
  const showChat = canLinkCustomerChat(roles) || !configured

  const [rows, setRows] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([])
  const [pipelineFilter, setPipelineFilter] = useState<TaskPipelineFilter>('all')
  const [filters, setFilters] = useState<TaskFilters>({
    scope: teamView ? 'all' : 'mine',
    status: '',
    project_id: projectFilter,
    customer_id: customerFilter,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFilters((f) => ({
      ...f,
      project_id: projectFilter,
      customer_id: customerFilter,
    }))
  }, [projectFilter, customerFilter])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [tasks, sum, people] = await Promise.all([
        listTasks(userId, { ...filters, status: '' }, teamView),
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

  const pipelineCounts = useMemo(() => {
    const counts: Partial<Record<TaskPipelineFilter, number>> = {
      all: rows.length,
      todo: 0,
      in_progress: 0,
      blocked: 0,
      overdue: 0,
      done: 0,
    }
    for (const row of rows) {
      if (row.status === 'todo') counts.todo = (counts.todo ?? 0) + 1
      if (row.status === 'in_progress') counts.in_progress = (counts.in_progress ?? 0) + 1
      if (row.status === 'blocked') counts.blocked = (counts.blocked ?? 0) + 1
      if (row.status === 'done') counts.done = (counts.done ?? 0) + 1
      if (isTaskOverdue(row.due_at, row.status)) counts.overdue = (counts.overdue ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(
    () => rows.filter((r) => matchesTaskPipeline(r, pipelineFilter)),
    [rows, pipelineFilter],
  )

  const overdueCount = summary?.overdue_count ?? pipelineCounts.overdue ?? 0
  const contextProjectName = rows.find((r) => r.project_id === projectFilter)?.project_name
  const contextCustomerName = rows.find((r) => r.customer_id === customerFilter)?.customer_brand_name

  function openTask(id: string) {
    navigate(`/app/tasks/${id}`)
  }

  function clearContextFilters() {
    setSearchParams({})
  }

  const newTaskUrl = projectFilter
    ? `/app/tasks/new?project=${encodeURIComponent(projectFilter)}${
        customerFilter ? `&customer=${encodeURIComponent(customerFilter)}` : ''
      }`
    : customerFilter
      ? `/app/tasks/new?customer=${encodeURIComponent(customerFilter)}`
      : '/app/tasks/new'

  return (
    <div className="page tasks-page">
      <header className="page__header crm-page__header sales-page__header">
        <div>
          <h1>งานภายใน</h1>
          <p className="muted">
            งานหลังบ้านทีม — ลูกค้าติดตามผ่านโปรเจกต์และแชทในพื้นที่ลูกค้า
          </p>
        </div>
        <div className="tasks-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          <Link to="/app/projects" className="crm-btn crm-btn--ghost">
            โปรเจกต์
          </Link>
          {show360 && (
            <Link to="/app/customers" className="crm-btn crm-btn--ghost">
              ลูกค้า 360°
            </Link>
          )}
          {showClient && (
            <Link to="/app/client/projects" className="crm-btn crm-btn--ghost">
              พื้นที่ลูกค้า
            </Link>
          )}
          <Link to={newTaskUrl} className="crm-btn crm-btn--primary">
            + สร้างงาน
          </Link>
        </div>
      </header>

      <TasksRoleGuide />

      {!configured && (
        <p className="crm-banner crm-banner--warn">
          โหมดพัฒนา — ข้อมูลเก็บในเครื่อง (localStorage)
        </p>
      )}

      {projectFilter && (
        <div className="tasks-context-banner" role="status">
          <p>
            กรองตามโปรเจกต์
            {contextProjectName ? (
              <>
                : <strong>{contextProjectName}</strong>
              </>
            ) : null}
          </p>
          <div className="tasks-context-banner__actions">
            <Link
              to={`/app/projects/${projectFilter}`}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              เปิดโปรเจกต์
            </Link>
            {showChat && (
              <Link
                to={chatUrlForCustomer(projectFilter)}
                className="crm-btn crm-btn--ghost crm-btn--sm"
              >
                แชทลูกค้า
              </Link>
            )}
            <button
              type="button"
              className="crm-btn crm-btn--ghost crm-btn--sm"
              onClick={clearContextFilters}
            >
              ดูงานทั้งหมด
            </button>
          </div>
        </div>
      )}

      {customerFilter && !projectFilter && (
        <div className="tasks-context-banner" role="status">
          <p>
            กรองตามลูกค้า
            {contextCustomerName ? (
              <>
                : <strong>{contextCustomerName}</strong>
              </>
            ) : null}
          </p>
          <div className="tasks-context-banner__actions">
            {show360 && (
              <Link
                to={`/app/customers/${customerFilter}`}
                className="crm-btn crm-btn--ghost crm-btn--sm"
              >
                ลูกค้า 360°
              </Link>
            )}
            {showClient && (
              <Link
                to={clientWorkspaceUrl(customerFilter, 'projects')}
                className="crm-btn crm-btn--ghost crm-btn--sm"
              >
                โปรเจกต์ลูกค้า
              </Link>
            )}
            <button
              type="button"
              className="crm-btn crm-btn--ghost crm-btn--sm"
              onClick={clearContextFilters}
            >
              ดูงานทั้งหมด
            </button>
          </div>
        </div>
      )}

      {overdueCount > 0 && pipelineFilter !== 'overdue' && !projectFilter && !customerFilter && (
        <div className="tasks-hint-banner" role="status">
          <p>
            มี <strong>{overdueCount}</strong> งานเกินกำหนด
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
        <section className="card-grid tasks-kpi-grid">
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

      <TasksPipelineFilterBar
        active={pipelineFilter}
        onSelect={setPipelineFilter}
        counts={pipelineCounts}
      />

      <section className="card card--wide">
        <div className="tasks-filters crm-form__grid">
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
          <div className="tasks-filters__refresh">
            <button type="button" className="crm-btn crm-btn--ghost" onClick={() => void load()}>
              รีเฟรช
            </button>
          </div>
        </div>

        {error && <p className="crm-error">{error}</p>}
        {loading && <p className="muted">กำลังโหลด...</p>}

        {!loading && rows.length === 0 && (
          <p className="muted">
            {projectFilter || customerFilter
              ? 'ยังไม่มีงานในบริบทนี้ — กด「สร้างงาน」เพื่อเพิ่ม'
              : 'ยังไม่มีงาน — กด「สร้างงาน」เพื่อเริ่ม'}
          </p>
        )}

        {!loading && rows.length > 0 && displayedRows.length === 0 && (
          <p className="muted">ไม่พบงานในตัวกรองนี้</p>
        )}

        {!loading && displayedRows.length > 0 && (
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable tasks-table">
              <thead>
                <tr>
                  <th>งาน</th>
                  <th>ลูกค้า</th>
                  <th>โปรเจกต์</th>
                  <th>ผู้รับผิดชอบ</th>
                  <th>ความสำคัญ</th>
                  <th>สถานะ</th>
                  <th>กำหนดเสร็จ</th>
                  <th className="tasks-table__actions-head">ลิงก์ด่วน</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => {
                  const overdue = isTaskOverdue(row.due_at, row.status)
                  return (
                    <tr
                      key={row.id}
                      className={overdue ? 'task-row--overdue' : undefined}
                      onClick={() => openTask(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openTask(row.id)
                      }}
                      tabIndex={0}
                      role="button"
                    >
                      <td>
                        <strong>{row.title}</strong>
                      </td>
                      <td>{row.customer_brand_name ?? '—'}</td>
                      <td>{row.project_name ?? '—'}</td>
                      <td>{row.assignee_name ?? '—'}</td>
                      <td>
                        <TaskPriorityBadge priority={row.priority} />
                      </td>
                      <td>
                        <TaskStatusBadge status={row.status} />
                      </td>
                      <td className={overdue ? 'tasks-due--overdue' : undefined}>
                        {formatBangkokDateTime(row.due_at)}
                      </td>
                      <td className="tasks-table__actions">
                        <Link
                          to={`/app/tasks/${row.id}`}
                          className="tasks-table__link tasks-table__link--primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          เปิด
                        </Link>
                        {row.project_id && (
                          <Link
                            to={`/app/projects/${row.project_id}`}
                            className="tasks-table__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            โปรเจกต์
                          </Link>
                        )}
                        {row.customer_id && showOnboarding && (
                          <Link
                            to={`/app/onboarding/${row.customer_id}`}
                            className="tasks-table__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            บรีฟ
                          </Link>
                        )}
                        {row.customer_id && show360 && (
                          <Link
                            to={`/app/customers/${row.customer_id}`}
                            className="tasks-table__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            360°
                          </Link>
                        )}
                        {row.customer_id && showClient && (
                          <Link
                            to={clientWorkspaceUrl(row.customer_id, 'projects')}
                            className="tasks-table__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ลูกค้า
                          </Link>
                        )}
                        {row.project_id && showChat && (
                          <Link
                            to={chatUrlForCustomer(row.project_id)}
                            className="tasks-table__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            แชท
                          </Link>
                        )}
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
