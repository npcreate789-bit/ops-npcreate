import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canAccessNotifications,
  canCreateCrmLead,
  canEditCrmLead,
  canCreateSalesQuotation,
  canManageLineSnippets,
  hasDbPrivilegedRole,
  isCrmReadOnly,
} from '../../../../shared/auth/access'
import { useAcknowledgeLeadNotificationOnView } from '../../notifications/useAcknowledgeLeadNotificationOnView'
import { listPackages } from '../../sales/api/packages'
import {
  normalizeServiceInterestCodes,
  optionsFromPackages,
  type ServicePackageOption,
} from '../../../../shared/packages/serviceInterests'
import { statusLabel } from '../constants'
import { createLead, deleteLead, getLead, updateLead } from '../api/leads'
import { leadDisplayName } from '../leadDisplay'
import { mergeAutoLeadStatus } from '../leadWorkflow'
import { LeadEditorHeader } from '../components/LeadEditorHeader'
import { LeadLineChatPanel } from '../components/LeadLineChatPanel'
import { LeadPreferredChannelPanel } from '../components/LeadPreferredChannelPanel'
import { LeadQuotationsSection } from '../components/LeadQuotationsSection'
import { usePageEntityLabel } from '../../../layout/PageHeadingContext'
import {
  LeadForm,
  formValuesToPayload,
  formValuesToUpdate,
  type LeadFormValues,
} from '../components/LeadForm'
import { readFocusLineChatFromState } from '../leadLineChatNavState'
import type { Lead } from '../types'
import '../../phase2/phase2.css'
import '../crm.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

export function LeadEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, configured } = useAuth()
  const focusLineChatOnMount = useRef(readFocusLineChatFromState(location.state)).current
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
  const [saveNotice, setSaveNotice] = useState<string | null>(null)
  const [initial, setInitial] = useState<Lead | null>(null)
  const [serviceOptions, setServiceOptions] = useState<ServicePackageOption[]>([])
  const [servicesInterested, setServicesInterested] = useState<string[]>([])
  const acknowledgeLeadNotif =
    (canAccessNotifications(roles) || !configured) && !isNew && !!initial
  useAcknowledgeLeadNotificationOnView(userId, acknowledgeLeadNotif ? id : undefined, true)
  const canEdit =
    (isNew ? canCreate : canEditCrmLead(roles, initial?.owner_id, userId)) ||
    !configured
  const readOnly = !canEdit && configured

  const applyLead = useCallback((lead: Lead | null, notice?: string | null) => {
    setInitial(lead)
    setSaveNotice(notice ?? null)
  }, [])

  useEffect(() => {
    if (!initial) {
      setServicesInterested([])
      return
    }
    setServicesInterested(
      normalizeServiceInterestCodes(initial.services_interested ?? [], serviceOptions),
    )
  }, [initial, serviceOptions])

  useEffect(() => {
    let cancelled = false
    listPackages()
      .then((pkgs) => {
        if (!cancelled) setServiceOptions(optionsFromPackages(pkgs))
      })
      .catch(() => {
        if (!cancelled) setServiceOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!focusLineChatOnMount) return
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} })
  }, [focusLineChatOnMount, navigate, location.pathname, location.search])

  useEffect(() => {
    if (isNew) {
      setLoading(false)
      applyLead(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    applyLead(null)
    getLead(id!)
      .then((lead) => {
        if (!cancelled) {
          if (!lead) {
            setError('ไม่พบ Lead')
            return
          }
          applyLead(lead)
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
  }, [id, isNew, applyLead])

  async function persistLeadUpdate(
    leadId: string,
    values: LeadFormValues,
    previous: Lead | null,
  ): Promise<{ lead: Lead | null; notice: string | null }> {
    await updateLead(leadId, formValuesToUpdate(values))
    let lead = await getLead(leadId)
    if (!lead) return { lead: null, notice: null }

    const mergedStatus = mergeAutoLeadStatus(lead, previous, values.status)
    let notice: string | null = null

    if (mergedStatus !== lead.status) {
      lead = await updateLead(leadId, { status: mergedStatus })
      notice = `อัปเดตสถานะเป็น "${statusLabel(mergedStatus)}" อัตโนมัติ — พร้อมส่งใบเสนอราคา`
    } else if (mergedStatus === 'quotation_sent' && previous?.status !== 'quotation_sent') {
      notice = 'สถานะพร้อมส่งใบเสนอราคา'
    }

    return { lead, notice }
  }

  async function goToCreateQuotation(
    leadId: string,
    formStatus: Lead['status'],
    notice?: string | null,
  ) {
    const closed: Lead['status'][] = ['won', 'not_interested']
    if (!closed.includes(formStatus)) {
      try {
        await updateLead(leadId, { status: 'quotation_sent' })
      } catch {
        /* ยังไปหน้าใบเสนอราคาได้แม้อัปเดตสถานะไม่สำเร็จ */
      }
    }
    navigate(`/app/sales/quotations/new?leadId=${leadId}&fromLead=1`, {
      state: { leadSaveNotice: notice ?? 'บันทึก Lead แล้ว — กรอกใบเสนอราคาต่อ' },
    })
  }

  async function handleSaveOnly(values: LeadFormValues) {
    setSaving(true)
    setError(null)
    setSaveNotice(null)
    try {
      if (isNew) {
        const created = await createLead(formValuesToPayload(values, ownerId))
        navigate(`/app/crm/${created.id}`, { replace: true })
        return
      }
      if (id) {
        const { lead, notice } = await persistLeadUpdate(id, values, initial)
        if (lead) applyLead(lead, notice ?? 'บันทึกแล้ว')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndQuotation(values: LeadFormValues) {
    setSaving(true)
    setError(null)
    setSaveNotice(null)
    try {
      if (isNew) {
        const created = await createLead(formValuesToPayload(values, ownerId))
        await goToCreateQuotation(created.id, values.status, 'สร้าง Lead แล้ว')
      } else if (id) {
        const { lead, notice } = await persistLeadUpdate(id, values, initial)
        if (!lead) return
        await goToCreateQuotation(id, values.status, notice)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  function handleLeadPatched(updated: Lead, notice?: string | null) {
    const previous = initial
    applyLead(updated, notice)
    if (!id || !previous) return
    const mergedStatus = mergeAutoLeadStatus(updated, previous, updated.status)
    if (mergedStatus === updated.status) return
    void (async () => {
      try {
        const lead = await updateLead(id, { status: mergedStatus })
        applyLead(
          lead,
          `เชื่อมต่อ LINE แล้ว — อัปเดตสถานะเป็น "${statusLabel(mergedStatus)}"`,
        )
      } catch {
        /* แสดง lead ที่บันทึก ID แล้วแม้ auto-status ล้มเหลว */
      }
    })()
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

  if (loading) {
    return (
      <div className="page crm-page">
        <LeadEditorHeader eyebrow="Lead" title="กำลังโหลด…" />
        <p className="crm-lead-header__loading muted">โปรดรอสักครู่</p>
      </div>
    )
  }

  if (isNew && !canCreate) {
    return (
      <div className="page crm-page">
        <LeadEditorHeader eyebrow="Lead" title="ไม่มีสิทธิ์สร้าง Lead" />
        <p className="crm-banner crm-banner--warn">
          บทบาทของคุณไม่สามารถสร้าง Lead ใหม่ได้ — ติดต่อทีม Sales
        </p>
      </div>
    )
  }

  if (!isNew && !loading && !initial) {
    return (
      <div className="page crm-page">
        <LeadEditorHeader eyebrow="Lead" title="ไม่พบรายการ" />
        {error ? <p className="crm-error">{error}</p> : null}
        <p className="muted">ตรวจสอบลิงก์หรือกลับไปรายการ Lead</p>
      </div>
    )
  }

  const headerSubtitle =
    !isNew && initial?.brand_name?.trim() && initial.contact_name?.trim()
      ? initial.brand_name.trim()
      : null

  usePageEntityLabel(isNew ? 'รายการใหม่' : initial ? leadDisplayName(initial) : null)

  return (
    <div className="page crm-page">
      <LeadEditorHeader
        eyebrow={isNew ? 'สร้าง Lead ใหม่' : 'รายละเอียด Lead'}
        title={isNew ? 'เพิ่มลูกค้าเป้าหมาย' : leadDisplayName(initial!)}
        subtitle={headerSubtitle}
        status={!isNew && initial ? initial.status : undefined}
        preferredContactChannel={initial?.preferred_contact_channel ?? null}
      />

      {error && <p className="crm-error">{error}</p>}
      {saveNotice ? (
        <p className="crm-banner crm-banner--ok" role="status">
          {saveNotice}
        </p>
      ) : null}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไข Lead นี้
        </p>
      )}

      {initial?.customer_id && (
        <p className="crm-banner crm-banner--ok">
          ปิดการขายแล้ว — มี Customer ในระบบ · ลูกค้าเข้า Client Workspace ได้หลังได้บัญชี
        </p>
      )}

      <div className="crm-lead-workspace">
        {!isNew && initial && initial.preferred_contact_channel === 'line' ? (
          <LeadLineChatPanel
            key={`line-chat-${initial.id}-${initial.line_oa_chat_user_id ?? ''}-${initial.updated_at}`}
            lead={initial}
            senderProfileId={userId}
            viewerUserId={userId}
            readOnly={readOnly}
            focusComposerOnMount={focusLineChatOnMount}
            servicesInterested={servicesInterested}
            serviceOptions={serviceOptions}
            canManageSnippets={canManageLineSnippets(roles)}
            onLeadUpdated={(updated) => handleLeadPatched(updated)}
          />
        ) : null}

        {!isNew &&
          initial &&
          initial.preferred_contact_channel !== 'line' && (
            <LeadPreferredChannelPanel
              lead={initial}
              readOnly={readOnly}
              onLeadUpdated={(updated) => handleLeadPatched(updated)}
            />
          )}
      </div>

      {!isNew && id && initial ? (
        <LeadQuotationsSection
          leadId={id}
          canCreate={showQuotationLink && !readOnly}
          onCreateRequest={() =>
            void goToCreateQuotation(id, initial.status, null)
          }
        />
      ) : null}

      <section className="card card--wide crm-lead-form-card">
        <header className="crm-lead-form-card__head">
          <h2>ข้อมูล Lead</h2>
          <p className="crm-lead-form-card__hint">
            บันทึกเพื่ออยู่ในหน้านี้ — สร้างใบเสนอราคาเมื่อพร้อม
          </p>
        </header>
        <LeadForm
          initial={initial}
          serviceOptions={serviceOptions}
          servicesInterested={servicesInterested}
          onServicesInterestedChange={setServicesInterested}
          saving={saving}
          readOnly={readOnly}
          submitLabel="บันทึก"
          onSubmit={handleSaveOnly}
          secondarySubmitLabel={
            showQuotationLink && !readOnly ? 'บันทึกและไปสร้างใบเสนอราคา' : undefined
          }
          onSecondarySubmit={
            showQuotationLink && !readOnly ? handleSaveAndQuotation : undefined
          }
          onCancel={() => navigate('/app/crm')}
        />
      </section>

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
