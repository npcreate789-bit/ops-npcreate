import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { listTasksForProject } from '../../tasks/api/tasks'
import { TaskStatusBadge } from '../../tasks/components/TaskStatusBadge'
import type { Task } from '../../tasks/types'

interface ProjectTasksSectionProps {
  projectId: string
}

export function ProjectTasksSection({ projectId }: ProjectTasksSectionProps) {
  const [rows, setRows] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listTasksForProject(projectId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดงานไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section className="card card--wide project-tasks">
      <div className="project-tasks__head">
        <h2>งานในโปรเจกต์</h2>
        <Link
          to={`/app/tasks/new?project=${projectId}`}
          className="crm-btn crm-btn--primary crm-btn--sm"
        >
          + สร้างงาน
        </Link>
      </div>
      {loading && <p className="muted">กำลังโหลดงาน...</p>}
      {error && <p className="crm-error">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">ยังไม่มีงานผูกกับโปรเจกต์นี้</p>
      )}
      {!loading && rows.length > 0 && (
        <ul className="project-tasks__list">
          {rows.map((t) => (
            <li key={t.id}>
              <Link to={`/app/tasks/${t.id}`} className="project-tasks__link">
                <span className="project-tasks__title">{t.title}</span>
                <TaskStatusBadge status={t.status} />
              </Link>
              <span className="muted project-tasks__meta">
                {t.assignee_name ?? '—'} · อัปเดต {formatBangkokDateTime(t.updated_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
