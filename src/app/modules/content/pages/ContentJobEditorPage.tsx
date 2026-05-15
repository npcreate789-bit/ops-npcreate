import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canDeleteContentJob,
  canManageContentJobs,
  isContentReadOnly,
} from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { listCustomersForSelect } from '../../finance/api/payments'
import type { CustomerOption } from '../../finance/types'
import {
  createContentJob,
  deleteContentJob,
  formToContentInput,
  getContentJob,
  listContentAssignees,
  updateContentJob,
} from '../api/contentJobs'
import { ContentJobForm, type ContentJobFormState } from '../components/ContentJobForm'
import type { ContentJob } from '../types'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../../tasks/tasks.css'
import '../content.css'
import '../../phase2/phase2.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function ContentJobEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile } = useAuth()
  const ownerId = profile?.id ?? DEV_OWNER
  const roles = profile?.roles ?? []
  const canManage = canManageContentJobs(roles) || !isSupabaseConfigured
  const readOnly = isContentReadOnly(roles) && isSupabaseConfigured

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<ContentJob | null>(null)
  const [assignees, setAssignees] = useState<{ id: string; label: string }[]>([])
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [saved, setSaved] = useState(false)

  const canDelete =
    canDeleteContentJob(roles, initial?.created_by, ownerId) || !isSupabaseConfigured

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [people, custList] = await Promise.all([
          listContentAssignees(),
          listCustomersForSelect(),
        ])
        if (!cancelled) {
          setAssignees(people)
          setCustomers(custList)
        }
        if (!isNew && id) {
          const job = await getContentJob(id)
          if (!cancelled) {
            if (!job) setError('ไม่พบงาน')
            else setInitial(job)
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
  }, [id, isNew])

  async function handleSubmit(form: ContentJobFormState) {
    if (!canManage) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const input = formToContentInput(form, initial?.created_by ?? ownerId)
      if (isNew) {
        const created = await createContentJob(input)
        navigate(`/app/content/${created.id}`, { replace: true })
      } else if (id) {
        const updated = await updateContentJob(id, input)
        setInitial(updated)
        setSaved(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || isNew || !canDelete) return
    if (!window.confirm('ลบงานคอนเทนต์นี้?')) return
    setSaving(true)
    try {
      await deleteContentJob(id)
      navigate('/app/content')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
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

  if (isNew && !canManage) {
    return (
      <div className="page">
        <p className="crm-error">ไม่มีสิทธิ์สร้างงานคอนเทนต์</p>
        <Link to="/app/content" className="crm-back">
          ← กลับรายการ
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header crm-page__header">
        <div>
          <Link to="/app/content" className="crm-back">
            ← กลับรายการ
          </Link>
          <h1>{isNew ? 'งานคอนเทนต์ใหม่' : initial?.title ?? 'แก้ไขงาน'}</h1>
        </div>
      </header>

      {readOnly && (
        <p className="crm-banner crm-banner--warn">โหมดดูอย่างเดียว — ไม่สามารถแก้ไขงานนี้ได้</p>
      )}
      {error && <p className="crm-error">{error}</p>}
      {saved && canManage && <p className="phase2-banner--ok">บันทึกเรียบร้อยแล้ว</p>}

      <section className="card card--wide">
        <ContentJobForm
          initial={initial}
          assignees={assignees}
          customers={customers}
          ownerId={ownerId}
          saving={saving}
          readOnly={readOnly || !canManage}
          onSubmit={(f) => void handleSubmit(f)}
          onCancel={() => navigate('/app/content')}
        />
      </section>

      {!isNew && canDelete && (
        <section className="card card--wide">
          <button
            type="button"
            className="crm-btn crm-btn--danger"
            disabled={saving}
            onClick={() => void handleDelete()}
          >
            ลบงาน
          </button>
        </section>
      )}
    </div>
  )
}
