import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageFinance } from '../../../../shared/auth/access'
import { getLead } from '../../crm/api/leads'
import { getQuotation, quotationPublicUrl } from '../../sales/api/quotations'
import { sendPaymentConfirmedViaLine } from '../../sales/sendPaymentConfirmedViaLine'
import { sendSlipRejectedViaLine } from '../../sales/sendSlipRejectedViaLine'
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
import '../../crm/crm.css'
import '../../sales/sales.css'
import '../finance.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

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
            else setInitial(pay)
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
      setError('ไม่มีสิทธิ์บันทึก — ต้องเป็น Admin')
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
      const pay = await getPayment(id)
      setInitial(pay)

      if (pay?.quotation_id) {
        const q = await getQuotation(pay.quotation_id)
        if (q?.lead_id) {
          const lead = await getLead(q.lead_id)
          const r = await sendPaymentConfirmedViaLine({
            leadId: q.lead_id,
            brandName: lead?.brand_name?.trim() || pay.customer_brand_name || 'ลูกค้า',
            quotationNumber: q.quotation_number,
            total: pay.total_amount,
            paymentId: pay.id,
            lineIds: lead
              ? {
                  line_user_id: lead.line_user_id,
                  line_oa_chat_user_id: lead.line_oa_chat_user_id,
                }
              : null,
          })
          if (r.ok) {
            setLineFeedback(
              r.mode === 'push'
                ? 'ยืนยันชำระแล้ว — แจ้งลูกค้าทาง LINE แล้ว'
                : 'ยืนยันชำระแล้ว — เปิด LINE / คัดลอกแจ้งลูกค้า',
            )
          } else {
            setLineFeedback(`ยืนยันชำระแล้ว — ${r.error}`)
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ยืนยันไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleRejectSlip() {
    if (!id || isNew || !initial?.slip_path) return
    const note = window.prompt('เหตุผลที่สลิปไม่ผ่าน (ไม่บังคับ)') ?? ''
    if (!window.confirm('ปฏิเสินสลิปและให้ลูกค้าอัปโหลดใหม่?')) return

    setRejecting(true)
    setLineFeedback(null)
    setError(null)
    try {
      const result = await rejectPaymentCustomerSlip(id, note)
      setInitial(await getPayment(id))

      if (result.lead_id) {
        const lead = await getLead(result.lead_id)
        const publicUrl = result.public_token
          ? quotationPublicUrl(result.public_token)
          : null
        let qnum: string | null = null
        if (result.quotation_id) {
          const q = await getQuotation(result.quotation_id)
          qnum = q?.quotation_number ?? null
        }
        const r = await sendSlipRejectedViaLine({
          leadId: result.lead_id,
          brandName: lead?.brand_name?.trim() || initial.customer_brand_name || 'ลูกค้า',
          quotationNumber: qnum,
          publicUrl,
          note,
          paymentId: id,
          lineIds: lead
            ? {
                line_user_id: lead.line_user_id,
                line_oa_chat_user_id: lead.line_oa_chat_user_id,
              }
            : null,
        })
        if (r.ok) {
          setLineFeedback(
            r.mode === 'push'
              ? 'ปฏิเสินสลิปแล้ว — แจ้งลูกค้าทาง LINE แล้ว'
              : 'ปฏิเสินสลิปแล้ว — เปิด LINE / คัดลอกแจ้งลูกค้า',
          )
        } else {
          setLineFeedback(`ปฏิเสินสลิปแล้ว — ${r.error}`)
        }
      } else {
        setLineFeedback('ปฏิเสินสลิปแล้ว — ลูกค้าสามารถอัปโหลดใหม่จากลิงก์ใบเสนอราคา')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ปฏิเสินสลิปไม่สำเร็จ')
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

  if (loading) {
    return (
      <div className="page">
        <p className="muted">กำลังโหลด...</p>
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

      {readOnly && (
        <p className="crm-banner crm-banner--warn no-print">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไขรายการชำระเงิน
        </p>
      )}

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

      {!isNew && initial && <PaymentNextStepsPanel payment={initial} />}

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
          {initial.status !== 'paid' && canEdit && (
            <section className="card card--wide no-print">
              <button
                type="button"
                className="crm-btn crm-btn--primary"
                disabled={saving}
                onClick={() => void handleConfirm()}
              >
                ยืนยันชำระเงิน (เปิดใช้งานลูกค้า)
              </button>
            </section>
          )}

          <section className="card card--wide no-print">
            <h2 className="crm-section-title">สลิปชำระเงิน</h2>
            <PaymentSlipPreview slipPath={initial.slip_path} />
            {canEdit && initial.status === 'pending' && initial.slip_path ? (
              <div className="finance-slip-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost"
                  disabled={rejecting || saving}
                  onClick={() => void handleRejectSlip()}
                >
                  {rejecting ? 'กำลังดำเนินการ…' : 'สลิปไม่ผ่าน — ขออัปโหลดใหม่'}
                </button>
              </div>
            ) : null}
            {canEdit && (
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
