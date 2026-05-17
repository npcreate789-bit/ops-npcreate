import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { listProjectsForCustomer } from '../../projects/api/projects'
import { projectServiceLabel, projectStatusLabel } from '../../projects/constants'
import { ClientPreviewBar } from '../components/ClientPreviewBar'
import { useClientWorkspace } from '../hooks/useClientWorkspace'
import { useEffect, useState } from 'react'
import type { Project } from '../../projects/types'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../client-workspace.css'

export function ClientProjectsPage() {
  const ws = useClientWorkspace()
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    if (!ws.customerId) {
      setProjects([])
      return
    }
    listProjectsForCustomer(ws.customerId)
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [ws.customerId])

  return (
    <div className="page">
      <header className="page__header">
        <h1>โปรเจกต์ของฉัน</h1>
        <p className="muted">ติดตามสถานะงานแยกตามบริการ</p>
      </header>

      <ClientPreviewBar
        configured={ws.configured}
        canPreview={ws.canPreview}
        customers={ws.customers}
        previewId={ws.previewId}
        onPreviewChange={ws.setPreviewId}
        data={ws.data}
        error={ws.error}
        isClientOnly={ws.isClientOnly}
      />

      {projects.length === 0 ? (
        <p className="muted">ยังไม่มีโปรเจกต์ในระบบ — ทีมจะสร้างหลังเริ่มสัญญา</p>
      ) : (
        <ul className="client-content-list">
          {projects.map((p) => (
            <li key={p.id}>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
