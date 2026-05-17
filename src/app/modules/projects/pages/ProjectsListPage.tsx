import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canViewWorkHub } from '../../../../shared/auth/access'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { listProjects } from '../api/projects'
import { ProjectsPipelineBar } from '../components/ProjectsPipelineBar'
import { ProjectsRoleGuide } from '../components/ProjectsRoleGuide'
import { ProjectStatusBadge } from '../components/ProjectStatusBadge'
import { projectServiceLabel } from '../constants'
import { getProjectPipelineStage, type ProjectPipelineFilter } from '../pipeline'
import type { Project } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../projects.css'

export function ProjectsListPage() {
  const { configured, profile } = useAuth()
  const showWorkLink = canViewWorkHub(profile?.roles ?? []) || !configured
  const navigate = useNavigate()
  const [rows, setRows] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<ProjectPipelineFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listProjects())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<ProjectPipelineFilter, number>> = { all: rows.length }
    for (const row of rows) {
      const stage = getProjectPipelineStage(row.status)
      counts[stage] = (counts[stage] ?? 0) + 1
    }
    return counts
  }, [rows])

  const displayedRows = useMemo(() => {
    if (stageFilter === 'all') return rows
    return rows.filter((r) => getProjectPipelineStage(r.status) === stageFilter)
  }, [rows, stageFilter])

  const kickoffCount = stageCounts.kickoff ?? 0

  return (
    <div className="page projects-page">
      <header className="page__header sales-page__header">
        <div>
          <h1>โปรเจกต์</h1>
          <p className="muted">
            หลังเปิดลูกค้าและรับบรีฟ → สร้างโปรเจกต์ → มอบงาน · แชท · ติดตามความคืบหน้า
          </p>
        </div>
        <div className="projects-page__header-actions">
          {showWorkLink && (
            <Link to="/app/work" className="crm-btn crm-btn--ghost">
              งานของฉัน
            </Link>
          )}
          <Link to="/app/onboarding" className="crm-btn crm-btn--ghost">
            รับบรีฟ
          </Link>
          <Link to="/app/client/projects" className="crm-btn crm-btn--ghost">
            มุมลูกค้า
          </Link>
          <Link to="/app/projects/new" className="crm-btn crm-btn--primary">
            + สร้างโปรเจกต์
          </Link>
        </div>
      </header>

      <ProjectsRoleGuide />

      {kickoffCount > 0 && stageFilter !== 'kickoff' && (
        <div className="projects-hint-banner" role="status">
          <p>
            มี <strong>{kickoffCount}</strong> โปรเจกต์ที่ยังเริ่มต้น/รอบรีฟ — ตรวจ Onboarding ก่อนดำเนินงาน
          </p>
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-btn--sm"
            onClick={() => setStageFilter('kickoff')}
          >
            ดูรายการเริ่มต้น
          </button>
        </div>
      )}

      <ProjectsPipelineBar active={stageFilter} onSelect={setStageFilter} counts={stageCounts} />

      {error && <p className="crm-error">{error}</p>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      {!loading && displayedRows.length === 0 && (
        <p className="muted">
          {stageFilter === 'all'
            ? 'ยังไม่มีโปรเจกต์ — สร้างหลัง Finance ยืนยันชำระและรับบรีฟ'
            : 'ไม่มีโปรเจกต์ในขั้นตอนนี้'}
        </p>
      )}

      {!loading && displayedRows.length > 0 && (
        <section className="card card--wide">
          <div className="crm-table-wrap">
            <table className="crm-table crm-table--clickable projects-table">
              <thead>
                <tr>
                  <th>โปรเจกต์</th>
                  <th>ลูกค้า</th>
                  <th>บริการ</th>
                  <th>สถานะ</th>
                  <th>ความคืบหน้า</th>
                  <th>สิ้นสุด</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/app/projects/${p.id}`)}>
                    <td>
                      <strong>{p.project_name}</strong>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {p.customer?.brand_name ? (
                        <Link to={`/app/customers/${p.customer_id}`}>
                          {p.customer.brand_name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{projectServiceLabel(p.service_type)}</td>
                    <td>
                      <ProjectStatusBadge status={p.status} />
                    </td>
                    <td>{p.progress}%</td>
                    <td>{formatBangkokDate(p.end_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
