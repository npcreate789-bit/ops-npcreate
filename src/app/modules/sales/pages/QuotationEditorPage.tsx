import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canCreateSalesQuotation,
  canEditSalesQuotation,
  hasDbPrivilegedRole,
} from '../../../../shared/auth/access'
import { getLead } from '../../crm/api/leads'
import { LeadPreferredChannelPanel } from '../../crm/components/LeadPreferredChannelPanel'
import { needsExternalContactBeforeQuotation } from '../../../../shared/crm/preferredContactChannel'
import { pickPackageIdForQuotation } from '../../../../shared/packages/serviceInterests'
import {
  createQuotation,
  deleteQuotation,
  getQuotation,
  listPackages,
  updateQuotation,
} from '../api/quotations'
import type { QuotationInput, Package, Quotation } from '../types'
import { QuotationForm, type QuotationSubmitMeta } from '../components/QuotationForm'
import { resolveLineMessagingRecipientId } from '../../../../shared/line/lineUserIdResolution'
import type { LineDeliveryMode } from '../../../../shared/line/staffLineMessaging'
import { validateQuotationLineSendPreflight } from '../quotationLineSendPreflight'
import { sendQuotationLinkViaLine } from '../sendQuotationViaLine'
import { copyTextToClipboard } from '../../../../shared/line/staffLineMessaging'
import { quotationPublicUrl } from '../api/quotations'
import { isQuotationSentLike } from '../constants'
import { printDocument } from '../../../../shared/print/printDocument'
import { QuotationPrintDocument } from '../components/QuotationPrintDocument'
import { QuotationPublicLink } from '../components/QuotationPublicLink'
import { QuotationNextStepsPanel } from '../components/QuotationNextStepsPanel'
import { QuotationLineStaffPanel } from '../components/QuotationLineStaffPanel'
import { DEFAULT_CONTRACT_MONTHS, lineUnitPriceForContract } from '../quotationPricing'
import '../../crm/crm.css'
import '../../phase2/phase2.css'
import '../sales.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function lineSendSuccessBannerMessage(mode: LineDeliveryMode): string {
  switch (mode) {
    case 'push':
      return 'ส่งการ์ดใบเสนอราคา (Flex) ทาง LINE แล้ว — ดูประวัติในแชท CRM'
    case 'open_oa':
      return 'เปิด LINE เพื่อส่งลิงก์ใบเสนอราคาให้ลูกค้าแล้ว'
    case 'copy_only':
      return 'คัดลอกข้อความพร้อมลิงก์แล้ว — วางส่งในแชท LINE'
    default:
      return 'ดำเนินการส่งลิงก์ใบเสนอราคาแล้ว'
  }
}

type QuotationLineSendFeedbackState = {
  ok: boolean
  message: string
  publicUrl?: string
}

type QuotationSavePhase = 'idle' | 'checking' | 'saving' | 'sending_line'

function quotationSavingLabel(
  phase: QuotationSavePhase,
  sendLine: boolean,
): string | undefined {
  if (phase === 'checking') return 'กำลังตรวจสอบสิทธิ์…'
  if (phase === 'saving') return 'กำลังบันทึก…'
  if (phase === 'sending_line' && sendLine) return 'กำลังส่งลิงก์ไป LINE…'
  return undefined
}

export function QuotationEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const leadIdParam = searchParams.get('leadId')
  const fromLeadSave = searchParams.get('fromLead') === '1'
  const navState =
    location.state as {
      leadSaveNotice?: string
      quotationLineSendFeedback?: QuotationLineSendFeedbackState
    } | null
  const leadSaveNotice = navState?.leadSaveNotice ?? null
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const ownerId = profile?.id ?? DEV_OWNER
  const canDelete = hasDbPrivilegedRole(roles)
  const canCreate = canCreateSalesQuotation(roles) || !configured

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savePhase, setSavePhase] = useState<QuotationSavePhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Quotation | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [leadBrandName, setLeadBrandName] = useState<string | null>(null)
  const [leadForBanner, setLeadForBanner] = useState<Awaited<ReturnType<typeof getLead>>>(null)
  const [leadServiceCodes, setLeadServiceCodes] = useState<string[]>([])
  const [suggestedPackage, setSuggestedPackage] = useState<Package | null>(null)

  const lineSendPrefTouchedRef = useRef(false)
  const [sendLineAfterSave, setSendLineAfterSave] = useState(false)
  const [lineSendFeedback, setLineSendFeedback] =
    useState<QuotationLineSendFeedbackState | null>(null)

  const lineIdsForSend = useMemo(
    () =>
      leadForBanner
        ? {
            line_user_id: leadForBanner.line_user_id,
            line_oa_chat_user_id: leadForBanner.line_oa_chat_user_id,
          }
        : null,
    [leadForBanner?.line_user_id, leadForBanner?.line_oa_chat_user_id],
  )

  const effectiveLeadId = leadIdParam ?? initial?.lead_id ?? ''
  const lineAutoSendAvailable = Boolean(
    effectiveLeadId.trim() &&
      leadForBanner &&
      resolveLineMessagingRecipientId(lineIdsForSend ?? {}),
  )

  useEffect(() => {
    if (lineSendPrefTouchedRef.current) return
    setSendLineAfterSave(lineAutoSendAvailable)
  }, [lineAutoSendAvailable])

  /** ยก feedback จาก navigate(…, { state }) ขึ้น state แล้วล้าง history state — ไม่ให้ข้อความค้างหลังบันทึกรอบถัดไป */
  useEffect(() => {
    const s = location.state as {
      quotationLineSendFeedback?: QuotationLineSendFeedbackState
      leadSaveNotice?: string
    } | null
    const fb = s?.quotationLineSendFeedback
    if (!fb) return
    setLineSendFeedback(fb)
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: s?.leadSaveNotice != null ? { leadSaveNotice: s.leadSaveNotice } : {},
    })
  }, [location.state, location.pathname, location.search, navigate])

  const quotationLineFeedback = lineSendFeedback

  const canEdit =
    (isNew
      ? canCreate
      : canEditSalesQuotation(roles, initial?.owner_id, ownerId)) || !configured
  const readOnly = !canEdit && configured

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const pkgs = await listPackages()
        if (!cancelled) setPackages(pkgs)

        const lid = leadIdParam ?? initial?.lead_id ?? undefined
        if (lid) {
          const lead = await getLead(lid)
          if (!cancelled && lead) {
            setLeadBrandName(lead.brand_name)
            setLeadForBanner(lead)
            setLeadServiceCodes(lead.services_interested ?? [])
            if (isNew && pkgs.length > 0) {
              const pkgId = pickPackageIdForQuotation(lead.services_interested ?? [], pkgs)
              const pkg = pkgId ? pkgs.find((p) => p.id === pkgId) ?? null : null
              setSuggestedPackage(pkg)
            }
          }
        }

        if (!isNew && id) {
          const qt = await getQuotation(id)
          if (!cancelled) {
            if (!qt) setError('ไม่พบใบเสนอราคา')
            else {
              setInitial(qt)
              setLeadBrandName(qt.lead_brand_name ?? null)
            }
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
  }, [id, isNew, leadIdParam, initial?.lead_id])

  async function refreshLeadLineIds(leadId: string) {
    const lead = await getLead(leadId)
    if (!lead) return lineIdsForSend
    setLeadForBanner(lead)
    setLeadBrandName(lead.brand_name)
    setLeadServiceCodes(lead.services_interested ?? [])
    return {
      line_user_id: lead.line_user_id,
      line_oa_chat_user_id: lead.line_oa_chat_user_id,
    }
  }

  function goToQuotationFlowWait(leadId: string, notice: string) {
    navigate(`/app/crm/${leadId}`, {
      state: {
        leadSaveNotice: notice,
        focusLineChat: true,
      },
    })
  }

  async function handleSubmit(input: QuotationInput, meta: QuotationSubmitMeta) {
    setError(null)
    setLineSendFeedback(null)

    const leadIdForSend = input.lead_id?.trim() ?? ''
    let idsForLineSend = lineIdsForSend
    if (meta.sendLineToCustomer && leadIdForSend) {
      idsForLineSend = await refreshLeadLineIds(leadIdForSend)
    }

    if (meta.sendLineToCustomer) {
      setSaving(true)
      setSavePhase('checking')
      const preflight = await validateQuotationLineSendPreflight({
        roles,
        configured,
        isNew,
        quotationOwnerId: initial?.owner_id,
        userId: ownerId,
        input,
        lineIds: idsForLineSend,
      })
      if (!preflight.ok) {
        setError(preflight.error)
        setSaving(false)
        setSavePhase('idle')
        return
      }
      setSavePhase('saving')
    } else {
      setSaving(true)
      setSavePhase('saving')
    }

    let toSave: QuotationInput = { ...input, owner_id: ownerId }
    if (
      meta.sendLineToCustomer &&
      input.lead_id &&
      !isQuotationSentLike(toSave.status)
    ) {
      toSave = { ...toSave, status: 'sent' }
    }

    try {
      if (isNew) {
        const created = await createQuotation(toSave)
        if (meta.sendLineToCustomer && created.lead_id) {
          setSavePhase('sending_line')
          const r = await sendQuotationLinkViaLine({
            quotation: created,
            brandName: leadBrandName ?? 'ลูกค้า',
            lineIds: idsForLineSend,
          })
          if (r.ok) {
            goToQuotationFlowWait(
              created.lead_id,
              `${lineSendSuccessBannerMessage(r.mode)} — ขั้นถัดไป: ติดตามลูกค้าในแชท LINE`,
            )
            return
          }
          const publicUrl =
            created.public_token != null ? quotationPublicUrl(created.public_token) : undefined
          navigate(`/app/sales/quotations/${created.id}`, {
            replace: true,
            state: {
              quotationLineSendFeedback: { ok: false, message: r.error, publicUrl },
            },
          })
          return
        }
        navigate(`/app/sales/quotations/${created.id}`, { replace: true })
      } else if (id) {
        await updateQuotation(id, toSave)
        const refreshed = await getQuotation(id)
        setInitial(refreshed)
        if (meta.sendLineToCustomer && refreshed?.lead_id) {
          setSavePhase('sending_line')
          const r = await sendQuotationLinkViaLine({
            quotation: refreshed,
            brandName: leadBrandName ?? 'ลูกค้า',
            lineIds: idsForLineSend,
          })
          if (r.ok) {
            goToQuotationFlowWait(
              refreshed.lead_id,
              `${lineSendSuccessBannerMessage(r.mode)} — ขั้นถัดไป: ติดตามลูกค้าในแชท LINE`,
            )
            return
          }
          const publicUrl =
            refreshed.public_token != null
              ? quotationPublicUrl(refreshed.public_token)
              : undefined
          setLineSendFeedback({ ok: false, message: r.error, publicUrl })
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
      setSavePhase('idle')
    }
  }

  async function retrySendQuotationLine() {
    if (!initial || isNew) return
    setLineSendFeedback(null)
    setError(null)

    const idsForRetry =
      initial.lead_id != null ? await refreshLeadLineIds(initial.lead_id) : lineIdsForSend
    const preflight = await validateQuotationLineSendPreflight({
      roles,
      configured,
      isNew: false,
      quotationOwnerId: initial.owner_id,
      userId: ownerId,
      input: {
        lead_id: initial.lead_id,
        owner_id: ownerId,
        status: initial.status,
        discount: initial.discount,
        vat_rate: initial.vat_rate,
        contract_months: initial.contract_months,
        terms: initial.terms,
        notes: initial.notes,
        items: (initial.items ?? []).map((item, idx) => ({
          package_id: item.package_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          sort_order: item.sort_order ?? idx,
        })),
      },
      lineIds: idsForRetry,
    })
    if (!preflight.ok) {
      setLineSendFeedback({ ok: false, message: preflight.error })
      return
    }

    setSaving(true)
    setSavePhase('sending_line')
    try {
      const r = await sendQuotationLinkViaLine({
        quotation: initial,
        brandName: leadBrandName ?? 'ลูกค้า',
        lineIds: idsForRetry,
      })
      if (r.ok && initial.lead_id) {
        goToQuotationFlowWait(
          initial.lead_id,
          `${lineSendSuccessBannerMessage(r.mode)} — ขั้นถัดไป: ติดตามลูกค้าในแชท LINE`,
        )
        return
      }
      setLineSendFeedback(
        r.ok
          ? {
              ok: true,
              message: lineSendSuccessBannerMessage(r.mode),
              publicUrl:
                initial.public_token != null
                  ? quotationPublicUrl(initial.public_token)
                  : undefined,
            }
          : { ok: false, message: r.error },
      )
      if (r.ok && id) {
        const refreshed = await getQuotation(id)
        if (refreshed) setInitial(refreshed)
      }
    } finally {
      setSaving(false)
      setSavePhase('idle')
    }
  }

  async function handleDelete() {
    if (!id || isNew) return
    if (!confirm('ลบใบเสนอราคานี้?')) return
    try {
      await deleteQuotation(id)
      navigate('/app/sales')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
    }
  }

  function handlePrint() {
    printDocument()
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="page sales-page">
      <header className="page__header no-print">
        <Link to="/app/sales" className="crm-back">
          ← กลับ Sales
        </Link>
        <h1>
          {isNew ? 'สร้างใบเสนอราคา' : `ใบเสนอราคา ${initial?.quotation_number ?? ''}`}
        </h1>
      </header>

      {error && <p className="crm-error no-print">{error}</p>}

      {quotationLineFeedback ? (
        <div
          className={`crm-banner no-print qt-line-send-banner ${quotationLineFeedback.ok ? 'crm-banner--ok' : 'crm-banner--warn'}`}
          role="status"
        >
          <p>{quotationLineFeedback.message}</p>
          <div className="qt-line-send-banner__actions">
            {quotationLineFeedback.ok && effectiveLeadId.trim() ? (
              <Link to={`/app/crm/${effectiveLeadId}`} className="crm-btn crm-btn--ghost">
                เปิดแชท CRM
              </Link>
            ) : null}
            {quotationLineFeedback.ok && quotationLineFeedback.publicUrl ? (
              <button
                type="button"
                className="crm-btn crm-btn--ghost"
                onClick={() =>
                  void copyTextToClipboard(quotationLineFeedback.publicUrl!).then((ok) => {
                    if (ok) {
                      setLineSendFeedback((prev) =>
                        prev
                          ? { ...prev, message: 'คัดลอกลิงก์ลูกค้าแล้ว — วางส่งช่องทางอื่นได้' }
                          : prev,
                      )
                    }
                  })
                }
              >
                คัดลอกลิงก์ลูกค้า
              </button>
            ) : null}
            {!quotationLineFeedback.ok && initial && !isNew ? (
              <button
                type="button"
                className="crm-btn crm-btn--primary"
                disabled={saving}
                onClick={() => void retrySendQuotationLine()}
              >
                {saving ? 'กำลังส่ง…' : 'ลองส่งอีกครั้ง'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {fromLeadSave && leadSaveNotice ? (
        <p className="crm-banner crm-banner--ok no-print" role="status">
          {leadSaveNotice}
        </p>
      ) : null}

      {leadForBanner &&
        needsExternalContactBeforeQuotation(leadForBanner) &&
        leadForBanner.preferred_contact_channel && (
          <div className="no-print">
            <LeadPreferredChannelPanel lead={leadForBanner} variant="quotation" />
          </div>
        )}

      {readOnly && (
        <p className="crm-banner crm-banner--warn phase2-scope-banner no-print">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไขใบเสนอราคานี้
        </p>
      )}

      {initial?.status === 'paid' && initial.customer_id && (
        <p className="crm-banner crm-banner--ok no-print">
          ปิดการขายแล้ว — ลูกค้าเข้า Client Workspace ได้หลังได้บัญชี · Account รับบรีฟต่อ
        </p>
      )}

      {!isNew && initial && <QuotationNextStepsPanel quotation={initial} />}

      {!isNew && initial && (
        <QuotationLineStaffPanel
          quotation={initial}
          brandName={leadBrandName ?? 'ลูกค้า'}
          leadServiceCodes={leadServiceCodes}
          lineIds={
            leadForBanner
              ? {
                  line_user_id: leadForBanner.line_user_id,
                  line_oa_chat_user_id: leadForBanner.line_oa_chat_user_id,
                }
              : null
          }
          packages={packages}
          saved
        />
      )}

      {isNew && (leadBrandName || leadIdParam) && (
        <QuotationLineStaffPanel
          quotation={{
            id: 'new',
            quotation_number: 'ฉบับร่าง',
            lead_id: leadIdParam,
            customer_id: null,
            owner_id: ownerId,
            status: 'draft',
            subtotal: 0,
            discount: 0,
            vat_rate: 7,
            vat_amount: 0,
            total: 0,
            contract_months: suggestedPackage ? DEFAULT_CONTRACT_MONTHS : null,
            terms: null,
            notes: null,
            sent_at: null,
            viewed_at: null,
            accepted_at: null,
            paid_at: null,
            public_token: null,
            created_at: '',
            updated_at: '',
            items: suggestedPackage
              ? [
                  {
                    id: 'draft',
                    quotation_id: 'new',
                    package_id: suggestedPackage.id,
                    description: suggestedPackage.name,
                    quantity: 1,
                    unit_price: lineUnitPriceForContract(
                      suggestedPackage.base_price,
                      DEFAULT_CONTRACT_MONTHS,
                    ),
                    line_total: lineUnitPriceForContract(
                      suggestedPackage.base_price,
                      DEFAULT_CONTRACT_MONTHS,
                    ),
                    sort_order: 0,
                  },
                ]
              : [],
          }}
          brandName={leadBrandName ?? 'ลูกค้า'}
          leadServiceCodes={leadServiceCodes}
          lineIds={
            leadForBanner
              ? {
                  line_user_id: leadForBanner.line_user_id,
                  line_oa_chat_user_id: leadForBanner.line_oa_chat_user_id,
                }
              : null
          }
          packages={packages}
          saved={false}
        />
      )}

      {!isNew && initial && (
        <section className="card card--wide no-print">
          <h2 className="crm-section-title">ลิงก์สำหรับลูกค้า</h2>
          <QuotationPublicLink
            quotation={initial}
            onTokenReady={() => {
              if (id) void getQuotation(id).then((qt) => qt && setInitial(qt))
            }}
          />
        </section>
      )}

      <section className="card card--wide no-print">
        <QuotationForm
          initial={initial}
          leadId={leadIdParam ?? initial?.lead_id ?? undefined}
          leadBrandName={leadBrandName ?? undefined}
          leadServiceCodes={leadServiceCodes}
          suggestedPackage={isNew ? suggestedPackage : null}
          ownerId={ownerId}
          packages={packages}
          saving={saving}
          savingLabel={quotationSavingLabel(savePhase, sendLineAfterSave)}
          readOnly={readOnly}
          fromLeadSave={fromLeadSave}
          lineAutoSendAvailable={lineAutoSendAvailable}
          sendLineAfterSave={sendLineAfterSave}
          onSendLineAfterSaveChange={(v) => {
            lineSendPrefTouchedRef.current = true
            setSendLineAfterSave(v)
          }}
          onSubmit={handleSubmit}
          onCancel={() =>
            leadIdParam ? navigate(`/app/crm/${leadIdParam}`) : navigate('/app/sales')
          }
        />
      </section>

      {!isNew && initial && (
        <section className="card card--wide qt-print-section">
          <div className="no-print qt-print-toolbar">
            <button type="button" className="crm-btn crm-btn--primary" onClick={handlePrint}>
              พิมพ์ / บันทึก PDF
            </button>
            <p className="muted">
              ตัวอย่างด้านล่าง — กดพิมพ์แล้วเลือก Save as PDF — ปิด &quot;Headers and footers&quot;
              / หัวท้ายกระดาษ ในกล่องพิมพ์เพื่อไม่ให้มี URL
            </p>
          </div>
          <QuotationPrintDocument quotation={initial} brandName={leadBrandName} />
        </section>
      )}

      {!isNew && canDelete && (
        <section className="crm-danger-zone no-print">
          <button type="button" className="crm-btn crm-btn--danger" onClick={() => void handleDelete()}>
            ลบใบเสนอราคา
          </button>
        </section>
      )}
    </div>
  )
}
