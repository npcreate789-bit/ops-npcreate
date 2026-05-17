import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import type { ChatChannelKey } from '../../chat/types'
import { ProjectCreateForm } from '../components/ProjectCreateForm'
import { ProjectNextStepsPanel } from '../components/ProjectNextStepsPanel'
import { ProjectTasksSection } from '../components/ProjectTasksSection'
import type { Project, ProjectServiceType, ProjectStatus } from '../types'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../projects.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const presetCustomerId = searchParams.get('customerId')
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const userId = profile?.id ?? DEV_OWNER
  const canCreateTask = hasTasksTeamView(profile?.roles ?? []) || !configured

  const [chatChannel, setChatChannel] = useState<ChatChannelKey>('client')
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
    if (isNew && presetCustomerId) setCustomerId(presetCustomerId)
  }, [isNew, presetCustomerId])

  useEffect(() => {
    void load()
  }, [load])

  const presetCustomer = useMemo(
    () => customers.find((c) => c.id === presetCustomerId),
    [customers, presetCustomerId],
  )

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  )

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
        progress: clampProgress(progress),
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
    <div className="page projects-page project-detail-page">
      <header className="page__header sales-page__header">
        <div>
          <Link to="/app/projects" className="crm-back">
            ← โปรเจกต์ทั้งหมด
          </Link>
          <h1>{isNew ? 'สร้างโปรเจกต์' : project?.project_name ?? 'โปรเจกต์'}</h1>
          {isNew ? (
            <p className="muted project-form__subtitle">
              เลือกลูกค้า ตั้งชื่อและประเภทบริการ — ปรับสถานะและความคืบหน้าได้หลังสร้างแล้ว
            </p>
          ) : (
            project && (
              <p className="muted">
                {projectServiceLabel(project.service_type)} · {projectStatusLabel(project.status)}
              </p>
            )
          )}
        </div>
      </header>

      {error && <p className="crm-error">{error}</p>}

      {!isNew && project && <ProjectNextStepsPanel project={project} />}

      <form
        className={`card card--wide crm-form project-form${isNew ? ' project-form--create' : ''}`}
        onSubmit={handleSubmit}
      >
        {isNew ? (
          <ProjectCreateForm
            customers={customers}
            customerId={customerId}
            onCustomerIdChange={setCustomerId}
            presetCustomer={presetCustomer}
            presetCustomerId={presetCustomerId}
            projectName={projectName}
            onProjectNameChange={setProjectName}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            notes={notes}
            onNotesChange={setNotes}
            saving={saving}
          />
        ) : (
          <>
            <fieldset className="project-form__section">
              <legend className="project-form__legend">ข้อมูลหลัก</legend>
              <div className="crm-form__grid">
                <label>
                  ลูกค้า
                  <div className="project-form__readonly">
                    {selectedCustomer?.brand_name ?? '—'}
                    {customerId && (
                      <>
                        {' '}
                        ·{' '}
                        <Link to={`/app/customers/${customerId}`}>เปิด 360°</Link>
                      </>
                    )}
                  </div>
                </label>

                <label className="crm-form__full project-form__field">
                  ชื่อโปรเจกต์ <span className="req">*</span>
                  <input
                    className="crm-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="เช่น GMV Max — ร้าน ABC"
                    required
                  />
                </label>

                <label className="project-form__field">
                  ประเภทบริการ
                  <select
                    className="crm-select project-form__select"
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
              </div>
            </fieldset>

            <fieldset className="project-form__section">
              <legend className="project-form__legend">สถานะและความคืบหน้า</legend>
              <div className="crm-form__grid">
                <label className="project-form__field">
                  สถานะ
                  <select
                    className="crm-select project-form__select"
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

                <label className="crm-form__full project-form__progress">
                  ความคืบหน้า
                  <div className="project-form__progress-row">
                    <input
                      type="range"
                      className="project-form__range"
                      min={0}
                      max={100}
                      step={5}
                      value={progress}
                      onChange={(e) => setProgress(clampProgress(Number(e.target.value)))}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                    <input
                      type="number"
                      className="crm-input project-form__progress-input"
                      min={0}
                      max={100}
                      value={progress}
                      onChange={(e) => setProgress(clampProgress(Number(e.target.value)))}
                      aria-label="ความคืบหน้า (เปอร์เซ็นต์)"
                    />
                    <span className="project-form__progress-suffix">%</span>
                  </div>
                  <div className="project-form__progress-bar" role="progressbar" aria-valuenow={progress}>
                    <div
                      className="project-form__progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </label>
              </div>
            </fieldset>

            <fieldset className="project-form__section">
              <legend className="project-form__legend">กำหนดการ</legend>
              <div className="crm-form__grid">
                <label className="project-form__field">
                  วันเริ่ม
                  <input
                    className="crm-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </label>
                <label className="project-form__field">
                  วันสิ้นสุด
                  <input
                    className="crm-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="project-form__section project-form__section--last">
              <legend className="project-form__legend">หมายเหตุ</legend>
              <label className="crm-form__full project-form__field">
                บันทึกภายในทีม
                <textarea
                  className="crm-input project-form__textarea"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เป้าหมาย ข้อตกลง หรือสิ่งที่ต้องติดตาม..."
                />
              </label>
            </fieldset>

            <div className="crm-form__actions">
              <Link to="/app/projects" className="crm-btn crm-btn--ghost">
                ยกเลิก
              </Link>
              <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </>
        )}
      </form>

      {!isNew && project && (
        <>
          <div className="project-detail__workspace">
            <ProjectTasksSection projectId={project.id} />
            <ProjectChatPanel
              projectId={project.id}
              projectName={project.project_name}
              customerId={project.customer_id}
              userId={userId}
              canCreateTask={canCreateTask}
              variant="card"
              channel={chatChannel}
              onChannelChange={setChatChannel}
            />
          </div>
          <section className="card card--wide">
            <h2 className="crm-section-title">ลิงก์ที่เกี่ยวข้อง</h2>
            <p className="muted">
              <Link to={`/app/customers/${project.customer_id}`}>ลูกค้า 360°</Link>
              {' · '}
              <Link to={`/app/onboarding/${project.customer_id}`}>รับบรีฟ</Link>
              {' · '}
              <Link to="/app/finance">การเงิน</Link>
              {' · '}
              <Link to="/app/client/projects">มุมลูกค้า</Link>
              {' · '}
              <Link to={`/app/tasks?project=${project.id}`}>งานของโปรเจกต์</Link>
              {' · '}
              <Link to={`/app/chat?project=${project.id}&channel=${chatChannel}`}>
                แชท
              </Link>
            </p>
          </section>
        </>
      )}
    </div>
  )
}
