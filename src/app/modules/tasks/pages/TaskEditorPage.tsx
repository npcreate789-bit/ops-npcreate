import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canEditTask, hasDbPrivilegedRole } from '../../../../shared/auth/access'
import {
  canLinkCustomerChat,
  canLinkCustomerClient,
  canLinkCustomerOnboarding,
  canViewCustomer360,
} from '../../customers/access'
import { chatUrlForCustomer, clientWorkspaceUrl } from '../../customers/customerLinks'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import {
  createTask,
  deleteTask,
  getTask,
  listAssignees,
  updateTask,
} from '../api/tasks'
import { listProjectsForTaskSelect } from '../../projects/api/projects'
import { TaskForm } from '../components/TaskForm'
import type { ProjectTaskOption, Task, TaskInput } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../../phase2/phase2.css'
import '../tasks.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function TaskEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const prefillProjectId = searchParams.get('project') ?? ''
  const prefillCustomerId = searchParams.get('customer') ?? ''
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const ownerId = profile?.id ?? DEV_OWNER
  const canDeletePrivileged =
    hasDbPrivilegedRole(roles) || !configured
  const showOnboarding = canLinkCustomerOnboarding(roles) || !configured
  const showClient = canLinkCustomerClient(roles) || !configured
  const show360 = canViewCustomer360(roles) || !configured
  const showChat = canLinkCustomerChat(roles) || !configured

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Task | null>(null)
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [projects, setProjects] = useState<ProjectTaskOption[]>([])

  const canEdit = canEditTask(roles, initial, ownerId) || !configured
  const readOnly = !canEdit && configured
  const customerId = initial?.customer_id || prefillCustomerId || null
  const projectId = initial?.project_id || prefillProjectId || null

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [people, custList, projectList] = await Promise.all([
          listAssignees(),
          listCustomersForSelect(),
          listProjectsForTaskSelect(),
        ])
        if (!cancelled) {
          setAssignees(people)
          setCustomers(custList)
          setProjects(projectList)
        }
        if (isNew && (prefillProjectId || prefillCustomerId) && !cancelled) {
          setInitial({
            id: '',
            title: '',
            description: null,
            status: 'todo',
            priority: 'medium',
            assignee_id: ownerId,
            created_by: ownerId,
            customer_id: prefillCustomerId || null,
            project_id: prefillProjectId || null,
            lead_id: null,
            due_at: null,
            completed_at: null,
            created_at: '',
            updated_at: '',
          })
        }
        if (!isNew && id) {
          const task = await getTask(id)
          if (!cancelled) {
            if (!task) setError('ไม่พบงาน')
            else setInitial(task)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, isNew, ownerId, prefillProjectId, prefillCustomerId])

  async function handleSubmit(input: TaskInput) {
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createTask(input)
        navigate(`/app/tasks/${created.id}`, { replace: true })
      } else if (id) {
        const updated = await updateTask(id, input)
        setInitial(updated)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || isNew) return
    if (!window.confirm('ลบงานนี้?')) return
    setSaving(true)
    try {
      await deleteTask(id)
      navigate('/app/tasks')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header">
        <div>
          <Link to="/app/tasks" className="crm-back">
            ← กลับรายการงาน
          </Link>
          <h1>{isNew ? 'สร้างงานใหม่' : initial?.title ?? 'แก้ไขงาน'}</h1>
          <p className="muted">
            งานภายใน — ลูกค้าไม่เห็นหน้านี้ ใช้แชทและโปรเจกต์ในพื้นที่ลูกค้าแทน
          </p>
        </div>
      </header>

      {(customerId || projectId) && (
        <nav className="tasks-related-links" aria-label="ลิงก์ที่เกี่ยวข้อง">
          {projectId && (
            <Link
              to={`/app/projects/${projectId}`}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              โปรเจกต์
            </Link>
          )}
          {projectId && showChat && (
            <Link
              to={chatUrlForCustomer(projectId)}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              แชทลูกค้า
            </Link>
          )}
          {customerId && show360 && (
            <Link
              to={`/app/customers/${customerId}`}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              ลูกค้า 360°
            </Link>
          )}
          {customerId && showOnboarding && (
            <Link
              to={`/app/onboarding/${customerId}`}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              รับบรีฟ
            </Link>
          )}
          {customerId && showClient && (
            <Link
              to={clientWorkspaceUrl(customerId, 'projects')}
              className="crm-btn crm-btn--ghost crm-btn--sm"
            >
              โปรเจกต์ลูกค้า
            </Link>
          )}
        </nav>
      )}

      {error && <p className="crm-error">{error}</p>}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — คุณไม่ใช่ผู้รับผิดชอบหรือผู้สร้างงานนี้
        </p>
      )}

      <section className="card card--wide">
        <TaskForm
          initial={initial}
          assignees={assignees}
          customers={customers}
          projects={projects}
          ownerId={ownerId}
          saving={saving}
          readOnly={readOnly}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/tasks')}
        />
      </section>

      {!isNew && !readOnly && (canDeletePrivileged || initial?.created_by === ownerId) && (
        <p style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="crm-btn crm-btn--danger"
            disabled={saving}
            onClick={() => void handleDelete()}
          >
            ลบงาน
          </button>
        </p>
      )}
    </div>
  )
}
