import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateCrmLead,
  canEditCrmLead,
  canCreateSalesQuotation,
  hasDbPrivilegedRole,
  isCrmReadOnly,
} from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
import { createLead, deleteLead, getLead, updateLead } from '../api/leads'
import { canViewLeadAttachments } from '../access'
import { LeadAttachmentsSection } from '../components/LeadAttachmentsSection'
import { LeadNextStepsPanel } from '../components/LeadNextStepsPanel'
import {
  LeadForm,
  formValuesToPayload,
  formValuesToUpdate,
  type LeadFormValues,
} from '../components/LeadForm'
import '../../phase2/phase2.css'
import '../crm.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function LeadEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const userId = profile?.id ?? DEV_OWNER
  const canDelete = hasDbPrivilegedRole(roles)
  const canCreate = canCreateCrmLead(roles) || !configured
  const showQuotationLink =
    canCreateSalesQuotation(roles) && !isCrmReadOnly(roles)

  const ownerId = userId

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Awaited<ReturnType<typeof getLead>>>(null)
  const canEdit =
    (isNew ? canCreate : canEditCrmLead(roles, initial?.owner_id, userId)) ||
    !configured
  const readOnly = !canEdit && configured

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      return
    }
    let cancelled = false
    getLead(id)
      .then((lead) => {
        if (!cancelled) {
          if (!lead) {
            setError('ไม่พบ Lead')
            return
          }
          setInitial(lead)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  async function handleSubmit(values: LeadFormValues) {
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createLead(formValuesToPayload(values, ownerId))
        navigate(`/app/crm/${created.id}`, { replace: true })
      } else if (id) {
        await updateLead(id, formValuesToUpdate(values))
        const refreshed = await getLead(id)
        setInitial(refreshed)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || isNew) return
    if (!confirm('ลบ Lead นี้ถาวร?')) return
    try {
      await deleteLead(id)
      navigate('/app/crm')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  const canViewAttachments =
    canViewLeadAttachments(roles, initial?.owner_id, userId) || !configured

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  if (isNew && !canCreate) {
    return (
      <div className="page crm-page">
        <header className="page__header">
          <Link to="/app/crm" className="crm-back">
            ← กลับรายการ
          </Link>
          <h1>ไม่มีสิทธิ์สร้าง Lead</h1>
        </header>
        <p className="crm-banner crm-banner--warn">
          บทบาทของคุณไม่สามารถสร้าง Lead ใหม่ได้ — ติดต่อทีม Sales
        </p>
      </div>
    )
  }

  return (
    <div className="page crm-page">
      <header className="page__header">
        <Link to="/app/crm" className="crm-back">
          ← กลับรายการ
        </Link>
        <h1>{isNew ? 'เพิ่ม Lead ใหม่' : `แก้ไข: ${initial?.brand_name ?? ''}`}</h1>
      </header>

      {error && <p className="crm-error">{error}</p>}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไข Lead นี้
        </p>
      )}

      {!isNew && initial && showQuotationLink && initial.status !== 'won' && (
        <p style={{ marginBottom: '1rem' }}>
          <Link
            to={`/app/sales/quotations/new?leadId=${id}`}
            className="crm-btn crm-btn--primary"
          >
            สร้างใบเสนอราคา
          </Link>
        </p>
      )}

      {initial?.customer_id && (
        <p className="crm-banner crm-banner--ok">
          ปิดการขายแล้ว — มี Customer ในระบบ · ลูกค้าเข้า Client Workspace ได้หลังได้บัญชี
        </p>
      )}

      {!isNew && initial && <LeadNextStepsPanel lead={initial} />}

      <section className="card card--wide">
        <LeadForm
          initial={initial}
          saving={saving}
          readOnly={readOnly}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/crm')}
        />
      </section>

      {!isNew && id && initial && isSupabaseConfigured && canViewAttachments && (
        <LeadAttachmentsSection
          leadId={id}
          ownerId={initial.owner_id}
          canUpload={canEdit}
        />
      )}

      {!isNew && canDelete && (
        <section className="crm-danger-zone">
          <button type="button" className="crm-btn crm-btn--danger" onClick={() => void handleDelete()}>
            ลบ Lead
          </button>
        </section>
      )}
    </div>
  )
}
