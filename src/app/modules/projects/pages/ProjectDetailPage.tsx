import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import { createProject, getProject, updateProject } from '../api/projects'
import {
  PROJECT_SERVICE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  projectServiceLabel,
  projectStatusLabel,
} from '../constants'
import { ProjectChatPanel } from '../../chat/components/ProjectChatPanel'
import { ProjectTasksSection } from '../components/ProjectTasksSection'
import type { Project, ProjectServiceType, ProjectStatus } from '../types'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import '../../crm/crm.css'
import '../projects.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const canCreateTask = hasTasksTeamView(profile?.roles ?? []) || !configured

  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [serviceType, setServiceType] = useState<ProjectServiceType>('GMV_MAX')
  const [status, setStatus] = useState<ProjectStatus>('onboarding')
  const [progress, setProgress] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (isNew) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const row = await getProject(id!)
      if (!row) {
        setError('ไม่พบโปรเจกต์')
        return
      }
      setProject(row)
      setCustomerId(row.customer_id)
      setProjectName(row.project_name)
      setServiceType(row.service_type)
      setStatus(row.status)
      setProgress(row.progress)
      setStartDate(row.start_date ?? '')
      setEndDate(row.end_date ?? '')
      setNotes(row.notes ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [id, isNew])

  useEffect(() => {
    listCustomersForSelect()
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customerId || !projectName.trim()) {
      setError('เลือกลูกค้าและชื่อโปรเจกต์')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        customer_id: customerId,
        project_name: projectName.trim(),
        service_type: serviceType,
        status,
        progress,
        start_date: startDate || null,
        end_date: endDate || null,
        notes: notes.trim() || null,
      }
      if (isNew) {
        const created = await createProject(payload)
        navigate(`/app/projects/${created.id}`, { replace: true })
      } else {
        await updateProject(id!, payload)
        await load()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted">กำลังโหลด...</p>

  return (
    <div className="page">
      <header className="page__header">
        <p className="muted">
          <Link to="/app/projects">← โปรเจกต์ทั้งหมด</Link>
        </p>
        <h1>{isNew ? 'สร้างโปรเจกต์' : project?.project_name ?? 'โปรเจกต์'}</h1>
        {!isNew && project && (
          <p className="muted">
            {projectServiceLabel(project.service_type)} · {projectStatusLabel(project.status)}
          </p>
        )}
      </header>

      {error && <p className="crm-error">{error}</p>}

      <form className="card card--wide crm-form" onSubmit={handleSubmit}>
        <label className="task-field">
          <span className="task-field__label">ลูกค้า *</span>
          <select
            className="task-select"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            disabled={!isNew}
          >
            <option value="">— เลือก —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand_name}
              </option>
            ))}
          </select>
        </label>

        <label className="task-field">
          <span className="task-field__label">ชื่อโปรเจกต์ *</span>
          <input
            className="task-input"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
        </label>

        <label className="task-field">
          <span className="task-field__label">ประเภทบริการ</span>
          <select
            className="task-select"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ProjectServiceType)}
          >
            {PROJECT_SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-field">
          <span className="task-field__label">สถานะ</span>
          <select
            className="task-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            {PROJECT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-field">
          <span className="task-field__label">Progress (%)</span>
          <input
            className="task-input"
            type="number"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
          />
        </label>

        <div className="crm-form__row">
          <label className="task-field">
            <span className="task-field__label">เริ่ม</span>
            <input
              className="task-input"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="task-field">
            <span className="task-field__label">สิ้นสุด</span>
            <input
              className="task-input"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <label className="task-field">
          <span className="task-field__label">หมายเหตุ</span>
          <textarea
            className="task-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </form>

      {!isNew && project && (
        <>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <ProjectTasksSection projectId={project.id} />
            <ProjectChatPanel
              projectId={project.id}
              projectName={project.project_name}
              customerId={project.customer_id}
              userId={userId}
              canCreateTask={canCreateTask}
            />
          </div>
          <section className="card card--wide">
            <h2>ลิงก์ที่เกี่ยวข้อง</h2>
            <p className="muted">
              <Link to={`/app/customers/${project.customer_id}`}>Customer 360</Link>
              {' · '}
              <Link to={`/app/onboarding/${project.customer_id}`}>บรีฟ / Onboarding</Link>
              {' · '}
              <Link to={`/app/tasks?project=${project.id}`}>งานทั้งหมดของโปรเจกต์</Link>
            </p>
          </section>
        </>
      )}
    </div>
  )
}
