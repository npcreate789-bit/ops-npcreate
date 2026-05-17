import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { projectServiceLabel } from '../../projects/constants'
import {
  clientProjectPrimaryCta,
  clientProjectStatusHint,
} from '../../projects/pipeline'
import { useClientWorkspaceContext } from '../context/ClientWorkspaceContext'
import '../../crm/crm.css'
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
        <p className="muted">ติดตามงานแยกตามบริการ — แต่ละโปรเจกต์มีแชทของตัวเอง</p>
      </header>

      <div className="client-brief-intro" role="note">
        ทีมจะสร้างโปรเจกต์หลังเริ่มสัญญา — คุณดูความคืบหน้าและคุยกับทีมได้จากที่นี่
      </div>

      {projectsLoading ? (
        <p className="muted" role="status">
          กำลังโหลดโปรเจกต์…
        </p>
      ) : projects.length === 0 ? (
        <p className="muted">
          ยังไม่มีโปรเจกต์ในระบบ — ทีมจะสร้างหลังยืนยันชำระและรับบรีฟ
        </p>
      ) : (
        <ul className="client-content-list client-project-list">
          {projects.map((p) => {
            const cta = clientProjectPrimaryCta(p)
            return (
              <li key={p.id} className="client-project-list__item">
                <div className="client-project-list__main">
                  <strong>{p.project_name}</strong>
                  <span className="muted"> · {projectServiceLabel(p.service_type)}</span>
                  <p className="client-project-list__hint">{clientProjectStatusHint(p.status)}</p>
                  <p className="muted client-project-list__meta">
                    ความคืบหน้า {p.progress}%
                    {p.end_date && ` · เป้าหมาย ${formatBangkokDate(p.end_date)}`}
                  </p>
                  <div className="phase2-progress" style={{ marginTop: '0.5rem' }} aria-hidden>
                    <div
                      className="phase2-progress__bar"
                      style={{ width: `${Math.min(100, p.progress)}%` }}
                    />
                  </div>
                </div>
                <Link
                  to={cta.to}
                  state={cta.state}
                  className="crm-btn crm-btn--primary crm-btn--sm"
                >
                  {cta.label}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
