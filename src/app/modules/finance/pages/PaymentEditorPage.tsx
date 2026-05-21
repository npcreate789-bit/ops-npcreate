import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import {
  canConfirmFinancePayment,
  canManageFinance,
  FINANCE_MANAGE_ROLES,
  formatRoleList,
} from '../../../../shared/auth/access'
import { getQuotation } from '../../sales/api/quotations'
import { formatPaymentLineNotifyFeedback } from '../api/paymentLineFeedback'
import { invokeNotifyPaymentCustomerLine } from '../api/notifyPaymentCustomerLine'
import { rejectPaymentCustomerSlip } from '../api/paymentSlipOps'
import {
  confirmPayment,
  createPayment,
  getCustomerWithQuotation,
  getPayment,
  listCustomersForSelect,
  updatePayment,
  uploadPaymentSlip,
} from '../api/payments'
import type { CustomerOption, Payment, PaymentInput } from '../types'
import { PaymentForm } from '../components/PaymentForm'
import { PaymentDocumentsSection } from '../components/PaymentDocumentsSection'
import { PaymentNextStepsPanel } from '../components/PaymentNextStepsPanel'
import { PaymentSlipPreview } from '../components/PaymentSlipPreview'
import { PaymentSlipVerificationPanel } from '../components/PaymentSlipVerificationPanel'
import { usePageEntityLabel } from '../../../layout/PageHeadingContext'
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../finance.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

function paymentVerificationLabel(
  status: string | null | undefined,
): string | null {
  switch (status) {
    case 'verifying':
      return 'กำลังตรวจสอบสลิปอัตโนมัติ'
    case 'review_required':
      return 'ตรวจอัตโนมัติเสร็จ — รอยืนยันจาก Finance'
    case 'confirmed':
      return 'ยืนยันการชำระแล้ว'
    default:
      return null
  }
}

export function PaymentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const customerId = searchParams.get('customerId')
  const quotationId = searchParams.get('quotationId')
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const ownerId = profile?.id ?? DEV_OWNER
  const canEdit = canManageFinance(roles) || !configured
  const canConfirm = canConfirmFinancePayment(roles) || !configured
  const readOnly = !canEdit && configured

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [lineFeedback, setLineFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initial, setInitial] = useState<Payment | null>(null)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [preset, setPreset] = useState<CustomerOption | null>(null)
  const [quotationTotal, setQuotationTotal] = useState<number | null>(null)
  const [quotationNumber, setQuotationNumber] = useState<string | null>(null)
  const [quotationLeadId, setQuotationLeadId] = useState<string | null>(null)
  const [quotationLeadBrand, setQuotationLeadBrand] = useState<string | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const custList = await listCustomersForSelect()
        if (!cancelled) setCustomers(custList)

        if (customerId) {
          const p = await getCustomerWithQuotation(customerId, quotationId)
          if (!cancelled && p) setPreset({ ...p, quotation_id: quotationId })
        }

        if (!isNew && id) {
          const pay = await getPayment(id)
          if (!cancelled) {
            if (!pay) setError('ไม่พบรายการ')
            else {
              setInitial(pay)
              if (pay.quotation_id) {
                const q = await getQuotation(pay.quotation_id)
                if (!cancelled && q) {
                  setQuotationTotal(q.total)
                  setQuotationNumber(q.quotation_number)
                  setQuotationLeadId(q.lead_id ?? null)
                  setQuotationLeadBrand(q.lead_brand_name ?? null)
                }
              }
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
  }, [id, isNew, customerId, quotationId])

  async function handleSubmit(input: PaymentInput) {
    if (!canEdit) {
      setError(`ไม่มีสิทธิ์บันทึก — ต้องเป็น ${formatRoleList(FINANCE_MANAGE_ROLES)}`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isNew) {
        const created = await createPayment(input)
        navigate(`/app/finance/payments/${created.id}`, { replace: true })
      } else if (id) {
        await updatePayment(id, input)
        setInitial(await getPayment(id))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm() {
    if (!id || isNew || !initial) return
    setSaving(true)
    setLineFeedback(null)
    setError(null)
    try {
      await confirmPayment(id)
      setInitial(await getPayment(id))

      const line = await invokeNotifyPaymentCustomerLine(id, 'payment_confirmed')
      setLineFeedback(formatPaymentLineNotifyFeedback('ยืนยันชำระ', line))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ยืนยันไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleRejectSlip() {
    if (!id || isNew || !initial?.slip_path) return
    const note = rejectNote.trim()
    setRejecting(true)
    setLineFeedback(null)
    setError(null)
    try {
      await rejectPaymentCustomerSlip(id, note)
      setInitial(await getPayment(id))

      const line = await invokeNotifyPaymentCustomerLine(id, 'slip_rejected', {
        rejectNote: note,
      })
      setLineFeedback(formatPaymentLineNotifyFeedback('ปฏิเสธสลิป', line))
      setRejectOpen(false)
      setRejectNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ปฏิเสธสลิปไม่สำเร็จ')
    } finally {
      setRejecting(false)
    }
  }

  async function handleSlip(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || isNew || !initial) return
    setUploading(true)
    try {
      await uploadPaymentSlip(id, initial.customer_id, ownerId, file)
      setInitial(await getPayment(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  usePageEntityLabel(
    isNew
      ? 'รายการใหม่'
      : initial
        ? `${initial.customer_brand_name ?? 'ลูกค้า'}${quotationNumber ? ` · ${quotationNumber}` : ''}`
        : null,
  )

  if (loading) {
    return (
      <div className="page finance-page">
        <header className="page__header no-print">
          <Link to="/app/finance" className="crm-back">
            ← กลับการเงิน
          </Link>
          <h1>{isNew ? 'บันทึกการชำระเงิน' : 'รายการชำระเงิน'}</h1>
          <p className="muted">กำลังโหลดข้อมูลการชำระเงิน — โปรดรอสักครู่</p>
        </header>
      </div>
    )
  }

  return (
    <div className="page finance-page">
      <header className="page__header no-print">
        <Link to="/app/finance" className="crm-back">
          ← กลับการเงิน
        </Link>
        <h1>{isNew ? 'บันทึกการชำระเงิน' : `รายการชำระเงิน`}</h1>
      </header>

      {error && <p className="crm-error no-print">{error}</p>}
      {lineFeedback ? (
        <p className="crm-banner crm-banner--ok no-print" role="status">
          {lineFeedback}
        </p>
      ) : null}

      {readOnly && canConfirm && (
        <p className="crm-banner no-print">
          บัญชี / การเงิน — ยืนยันชำระและตรวจสลิปได้ แต่แก้ไขฟอร์มหลักต้องเป็น {formatRoleList(FINANCE_MANAGE_ROLES)}
        </p>
      )}
      {readOnly && !canConfirm && (
        <p className="crm-banner crm-banner--warn no-print">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไขรายการชำระเงิน
        </p>
      )}

      {initial?.verification_status && !initial.confirmed_at ? (
        <p
          className={`crm-banner no-print${
            initial.verification_status === 'verifying' ? ' crm-banner--warn' : ''
          }`}
          role="status"
        >
          {paymentVerificationLabel(initial.verification_status)}
        </p>
      ) : null}

      {initial?.confirmed_at && (
        <p className="crm-banner no-print">
          ยืนยันชำระแล้ว — ลูกค้า Active
          {initial.quotation_id ? ' · ใบเสนอราคาและ Lead อัปเดตเป็นปิดการขายแล้ว' : ''}{' '}
          ไปที่{' '}
          <Link to={`/app/onboarding/${initial.customer_id}`}>รับบรีฟลูกค้า</Link>
          {' · '}
          <Link to="/app/client">Client Workspace</Link>
          {' · '}
          <Link to={`/app/customers/${initial.customer_id}`}>ลูกค้า 360°</Link>
        </p>
      )}

      {!isNew && initial && (
        <PaymentNextStepsPanel
          payment={initial}
          leadId={quotationLeadId}
          leadBrandName={quotationLeadBrand}
        />
      )}

      <section className="card card--wide no-print">
        <PaymentForm
          initial={initial}
          preset={preset}
          customers={customers}
          ownerId={ownerId}
          saving={saving}
          readOnly={readOnly}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/app/finance')}
        />
      </section>

      {!isNew && initial && (
        <>
          {initial.status !== 'paid' && canConfirm && (
            <section className="card card--wide no-print finance-confirm-bar">
              <div className="finance-confirm-bar__main">
                <strong className="finance-confirm-bar__title">พร้อมยืนยันการชำระ?</strong>
                <span className="muted">
                  ตรวจ amount, paid_at และบัญชีปลายทางจากสลิป — ยืนยันแล้วจะเปิดใช้งานลูกค้าและส่ง LINE
                </span>
              </div>
              {initial.slip_path && initial.verification_status === 'verifying' ? (
                <div className="finance-confirm-bar__actions">
                  <button
                    type="button"
                    className="crm-btn crm-btn--primary"
                    disabled
                    title="รอผลตรวจสลิปอัตโนมัติก่อนยืนยัน"
                  >
                    รอผลตรวจสลิปอัตโนมัติ…
                  </button>
                  <span className="muted" style={{ fontSize: '0.78rem' }}>
                    ปุ่มยืนยันจะเปิดเมื่อ OCR เสร็จ
                  </span>
                </div>
              ) : (
                <div className="finance-confirm-bar__actions">
                  <button
                    type="button"
                    className="crm-btn crm-btn--primary"
                    disabled={saving}
                    onClick={() => void handleConfirm()}
                  >
                    ยืนยันชำระเงิน (เปิดใช้งานลูกค้า)
                  </button>
                </div>
              )}
            </section>
          )}

          {initial.slip_path || initial.verification_status !== 'none' ? (
            <PaymentSlipVerificationPanel
              payment={initial}
              quotationTotal={quotationTotal}
              quotationNumber={quotationNumber}
              canManage={canConfirm}
              onUpdated={async () => {
                if (!id) return
                setInitial(await getPayment(id))
              }}
            />
          ) : null}

          <section className="card card--wide no-print">
            <h2 className="crm-section-title">สลิปชำระเงิน</h2>
            <PaymentSlipPreview slipPath={initial.slip_path} />
            {canConfirm && initial.status === 'pending' && initial.slip_path ? (
              <div className="finance-slip-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost"
                  disabled={rejecting || saving || rejectOpen}
                  onClick={() => setRejectOpen(true)}
                >
                  สลิปไม่ผ่าน — ขออัปโหลดใหม่
                </button>
                {rejectOpen ? (
                  <div className="finance-reject-modal" role="dialog" aria-label="ปฏิเสธสลิป">
                    <h3 className="finance-reject-modal__title">ปฏิเสธสลิปและขออัปโหลดใหม่</h3>
                    <label className="finance-reject-modal__label" htmlFor="reject-note">
                      เหตุผล (ไม่บังคับ) — ส่งทาง LINE ให้ลูกค้า
                    </label>
                    <textarea
                      id="reject-note"
                      className="finance-reject-modal__textarea"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={3}
                      placeholder="เช่น ยอดไม่ตรง / รูปไม่ชัด / ผิดบัญชี"
                      disabled={rejecting}
                      autoFocus
                    />
                    <div className="finance-reject-modal__actions">
                      <button
                        type="button"
                        className="crm-btn crm-btn--primary"
                        disabled={rejecting}
                        onClick={() => void handleRejectSlip()}
                      >
                        {rejecting ? 'กำลังดำเนินการ…' : 'ยืนยันปฏิเสธสลิป'}
                      </button>
                      <button
                        type="button"
                        className="crm-btn crm-btn--ghost"
                        disabled={rejecting}
                        onClick={() => {
                          setRejectOpen(false)
                          setRejectNote('')
                        }}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {canConfirm && (
              <>
                <p className="muted finance-slip-upload-label">
                  {initial.slip_path ? 'อัปโหลดสลิปใหม่ (แทนที่ของเดิม)' : 'แนบสลิป'}
                </p>
                <input type="file" accept="image/*,.pdf" onChange={handleSlip} disabled={uploading} />
                {uploading && <p className="muted">กำลังอัปโหลด...</p>}
              </>
            )}
          </section>

          <PaymentDocumentsSection
            payment={initial}
            ownerId={ownerId}
            roles={roles}
            readOnly={readOnly}
            onPaymentUpdated={setInitial}
          />
        </>
      )}
    </div>
  )
}
