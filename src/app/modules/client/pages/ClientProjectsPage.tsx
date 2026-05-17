import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { projectServiceLabel, projectStatusLabel } from '../../projects/constants'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../../phase2/phase2.css'
import '../client-workspace.css'

export function ClientProjectsPage() {
  const ws = useClientWorkspaceContext()
  const { projects, projectsLoading } = ws

  if (ws.loading) {
    return null
  }

  if (!ws.customerId) {
    return (
      <div className="page client-page">
        <header className="page__header">
          <h2>โปรเจกต์ของฉัน</h2>
          <p className="muted">ยังไม่พบข้อมูลลูกค้าที่เชื่อมกับบัญชีนี้</p>
        </header>
      </div>
    )
  }

  return (
    <div className="page client-page">
      <header className="page__header">
        <h2>โปรเจกต์ของฉัน</h2>
        <p className="muted">ติดตามสถานะงานแยกตามบริการ — แชทได้ในแต่ละโปรเจกต์</p>
      </header>

      {projectsLoading ? (
        <p className="muted" role="status">
          กำลังโหลดโปรเจกต์…
        </p>
      ) : projects.length === 0 ? (
        <p className="muted">ยังไม่มีโปรเจกต์ในระบบ — ทีมจะสร้างหลังเริ่มสัญญา</p>
      ) : (
        <ul className="client-content-list client-project-list">
          {projects.map((p) => (
            <li key={p.id} className="client-project-list__item">
              <div className="client-project-list__main">
                <strong>{p.project_name}</strong>
                <span className="muted"> · {projectServiceLabel(p.service_type)}</span>
                <br />
                <span className="muted">
                  {projectStatusLabel(p.status)} · {p.progress}% · ถึง{' '}
                  {formatBangkokDate(p.end_date)}
                </span>
                <div className="phase2-progress" style={{ marginTop: '0.5rem' }} aria-hidden>
                  <div
                    className="phase2-progress__bar"
                    style={{ width: `${Math.min(100, p.progress)}%` }}
                  />
                </div>
              </div>
              <Link
                to="/app/client/chat"
                state={{ projectId: p.id }}
                className="crm-btn crm-btn--ghost"
              >
                แชท
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
