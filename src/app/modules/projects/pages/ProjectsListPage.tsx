import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBangkokDate } from '../../../../shared/dates/bangkok'
import { listProjects } from '../api/projects'
import { projectServiceLabel, projectStatusLabel } from '../constants'
import type { Project } from '../types'
import '../../crm/crm.css'
import '../projects.css'

export function ProjectsListPage() {
  const [rows, setRows] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Project Workspace</h1>
          <p className="muted">พื้นที่ทำงานต่อโปรเจกต์ / บริการ</p>
        </div>
        <Link to="/app/projects/new" className="crm-btn crm-btn--primary">
          + สร้างโปรเจกต์
        </Link>
      </header>

      {error && <p className="crm-error">{error}</p>}
      {loading && <p className="muted">กำลังโหลด...</p>}

      {!loading && rows.length === 0 && (
        <p className="muted">ยังไม่มีโปรเจกต์ — สร้างหลังปิดการขายและเปิดลูกค้า</p>
      )}

      {rows.length > 0 && (
        <section className="card card--wide">
          <table className="projects-table">
            <thead>
              <tr>
                <th>โปรเจกต์</th>
                <th>ลูกค้า</th>
                <th>บริการ</th>
                <th>สถานะ</th>
                <th>Progress</th>
                <th>สิ้นสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/app/projects/${p.id}`}>{p.project_name}</Link>
                  </td>
                  <td>
                    {p.customer?.brand_name ? (
                      <Link to={`/app/customers/${p.customer_id}`}>
                        {p.customer.brand_name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{projectServiceLabel(p.service_type)}</td>
                  <td>{projectStatusLabel(p.status)}</td>
                  <td>{p.progress}%</td>
                  <td>{formatBangkokDate(p.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
