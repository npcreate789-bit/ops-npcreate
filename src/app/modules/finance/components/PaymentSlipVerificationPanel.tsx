import { useState } from 'react'
import { formatThaiBaht } from '../../../../shared/payment/buildPaymentInstructionsMessage'
import { invokeVerifyPaymentSlip } from '../api/paymentSlipVerify'
import type { Payment } from '../types'
import '../finance.css'

const LOW_CONFIDENCE = 0.6
const MID_CONFIDENCE = 0.8

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Math.round(value * 100)}%`
}

function confidenceClass(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return ''
  if (value < LOW_CONFIDENCE) return 'finance-slip-confidence--low'
  if (value < MID_CONFIDENCE) return 'finance-slip-confidence--mid'
  return 'finance-slip-confidence--high'
}

function verificationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'verifying':
      return 'กำลังตรวจสอบสลิปอัตโนมัติ'
    case 'review_required':
      return 'รอทีมยืนยัน (อ่านสลิปอัตโนมัติเสร็จแล้ว)'
    case 'confirmed':
      return 'ยืนยันการชำระแล้ว'
    case 'none':
    case null:
    case undefined:
      return 'ยังไม่มีสลิป'
    default:
      return String(status)
  }
}

export function PaymentSlipVerificationPanel({
  payment,
  quotationTotal,
  quotationNumber,
  canManage,
  onUpdated,
}: {
  payment: Payment
  quotationTotal?: number | null
  quotationNumber?: string | null
  canManage?: boolean
  onUpdated: () => void | Promise<void>
}) {
  const [rerunning, setRerunning] = useState(false)
  const [rerunError, setRerunError] = useState<string | null>(null)
  const ocr = payment.verification_result as Record<string, unknown> | null | undefined
  const reasons = Array.isArray(ocr?.reasons) ? (ocr.reasons as string[]) : []
  const expected = quotationTotal ?? payment.total_amount
  const detected = payment.slip_detected_amount ?? null
  const amountMismatch =
    detected != null && expected != null && Math.abs(Number(detected) - Number(expected)) > 1

  if (!payment.slip_path && payment.verification_status === 'none') {
    return null
  }

  async function handleRerun() {
    setRerunError(null)
    setRerunning(true)
    try {
      const res = await invokeVerifyPaymentSlip(payment.id, { force: true })
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        setRerunError(String(res.error))
      }
      await onUpdated()
    } catch (e) {
      setRerunError(e instanceof Error ? e.message : 'รันตรวจสลิปไม่สำเร็จ')
    } finally {
      setRerunning(false)
    }
  }

  const confidence = payment.verification_confidence
  const confCls = confidenceClass(confidence)
  const lowConfidence = confidence != null && confidence < LOW_CONFIDENCE

  return (
    <section className="card card--wide finance-slip-verify no-print">
      <h2 className="crm-section-title">ผลตรวจสลิปอัตโนมัติ</h2>
      <dl className="finance-slip-verify__grid">
        <div>
          <dt>สถานะ</dt>
          <dd>{verificationStatusLabel(payment.verification_status)}</dd>
        </div>
        <div>
          <dt>ยอดใบเสนอราคา</dt>
          <dd>{formatThaiBaht(expected)}</dd>
        </div>
        <div className={amountMismatch ? 'finance-slip-low-confidence' : undefined}>
          <dt>ยอดที่อ่านจากสลิป</dt>
          <dd>
            {detected != null ? formatThaiBaht(detected) : '—'}
            {amountMismatch ? ' ⚠ ไม่ตรงยอด' : ''}
          </dd>
        </div>
        <div>
          <dt>ความมั่นใจ OCR</dt>
          <dd className={confCls}>
            {formatPct(confidence)}
            {lowConfidence ? ' ⚠' : ''}
          </dd>
        </div>
        {quotationNumber ? (
          <div>
            <dt>เลขที่ใบ</dt>
            <dd>{quotationNumber}</dd>
          </div>
        ) : null}
        {typeof ocr?.reference_text === 'string' && ocr.reference_text ? (
          <div className="finance-slip-verify__full">
            <dt>ข้อความอ้างอิงบนสลิป</dt>
            <dd>{ocr.reference_text}</dd>
          </div>
        ) : null}
        {typeof ocr?.raw_summary === 'string' && ocr.raw_summary ? (
          <div className="finance-slip-verify__full">
            <dt>สรุป OCR</dt>
            <dd>{ocr.raw_summary}</dd>
          </div>
        ) : null}
        {typeof ocr?.error === 'string' && ocr.error ? (
          <div className="finance-slip-verify__full">
            <dt>หมายเหตุ</dt>
            <dd className="crm-error">{ocr.error}</dd>
          </div>
        ) : null}
      </dl>

      {reasons.length > 0 ? (
        <ul className="finance-slip-verify__reasons muted">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}

      {canManage &&
      payment.slip_path &&
      (payment.verification_status === 'verifying' ||
        payment.verification_status === 'review_required') ? (
        <>
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={rerunning}
            onClick={() => void handleRerun()}
          >
            {rerunning ? 'กำลังตรวจ…' : 'รันตรวจสลิปอีกครั้ง'}
          </button>
          {rerunError ? <p className="crm-error">{rerunError}</p> : null}
        </>
      ) : null}
    </section>
  )
}
