import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { canManageFinance } from '../../../../shared/auth/access'
import { isSupabaseConfigured } from '../../../../shared/supabase/client'
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
  const { profile } = useAuth()
  const ownerId = profile?.id ?? DEV_OWNER
  const canEdit =
    canManageFinance(profile?.roles ?? []) || !isSupabaseConfigured
  const readOnly = !canEdit && isSupabaseConfigured

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
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
    if (!id || isNew) return
    setSaving(true)
    try {
      await confirmPayment(id)
      setInitial(await getPayment(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ยืนยันไม่สำเร็จ')
    } finally {
      setSaving(false)
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
      <header className="page__header">
        <Link to="/app/finance" className="crm-back">
          ← กลับการเงิน
        </Link>
        <h1>{isNew ? 'บันทึกการชำระเงิน' : `รายการชำระเงิน`}</h1>
      </header>

      {error && <p className="crm-error">{error}</p>}

      {readOnly && (
        <p className="crm-banner crm-banner--warn">
          โหมดดูอย่างเดียว — คุณไม่มีสิทธิ์แก้ไขรายการชำระเงิน
        </p>
      )}

      {initial?.confirmed_at && (
        <p className="crm-banner">
          ยืนยันชำระแล้ว — ลูกค้า Active แล้ว ไปที่{' '}
          <Link to={`/app/onboarding/${initial.customer_id}`}>รับบรีฟลูกค้า</Link>{' '}
          เพื่อกรอกข้อมูลก่อนยิงแอด
        </p>
      )}

      <section className="card card--wide">
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
            <section className="card card--wide">
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

          <section className="card card--wide">
            <h2 className="crm-section-title">สลิปชำระเงิน</h2>
            <PaymentSlipPreview slipPath={initial.slip_path} />
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

          {(initial.receipt_number || initial.tax_invoice_number) && (
            <section className="card card--wide">
              <h2 className="crm-section-title">เอกสาร</h2>
              {initial.receipt_number && <p>ใบเสร็จ: {initial.receipt_number}</p>}
              {initial.tax_invoice_number && (
                <p>ใบกำกับภาษี: {initial.tax_invoice_number}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
