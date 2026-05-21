import { useEffect, useState, type FormEvent } from 'react'
import {
  canConfirmFinancePayment,
  canManageFinance,
  FINANCE_MANAGE_ROLES,
  formatRoleList,
} from '../../../../shared/auth/access'
import type { AppRole } from '../../../../shared/types/roles'
import {
  loadCompanyPaymentSettingsForEdit,
  saveCompanyPaymentSettings,
} from '../api/companyPayment'
import '../../crm/crm.css'

export function CompanyPaymentSettingsSection({
  roles,
  configured,
}: {
  roles: AppRole[]
  configured: boolean
}) {
  const canEdit = canManageFinance(roles) || !configured
  const canView = canEdit || canConfirmFinancePayment(roles)
  const viewOnly = canView && !canEdit
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [promptpayId, setPromptpayId] = useState('')
  const [slaHours, setSlaHours] = useState('48')
  const [verificationSeconds, setVerificationSeconds] = useState('90')
  const [autoConfirmEnabled, setAutoConfirmEnabled] = useState(false)
  const [autoConfirmMax, setAutoConfirmMax] = useState('50000')
  const [amountTolerance, setAmountTolerance] = useState('1')
  const [requireRefMatch, setRequireRefMatch] = useState(true)
  const [manualReviewMin, setManualReviewMin] = useState('100000')
  const [lineSlipReceived, setLineSlipReceived] = useState(true)
  const [lineConfirmed, setLineConfirmed] = useState(true)
  const [lineRejected, setLineRejected] = useState(true)
  const [lineReviewPending, setLineReviewPending] = useState(true)
  const [bankMatchAuto, setBankMatchAuto] = useState(false)
  const [bankMatchTolerance, setBankMatchTolerance] = useState('1')
  const [bankMatchLookback, setBankMatchLookback] = useState('14')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadCompanyPaymentSettingsForEdit()
      .then((s) => {
        if (cancelled) return
        setBankName(s.bank_name)
        setAccountNumber(s.account_number)
        setAccountName(s.account_name)
        setPromptpayId(s.promptpay_id)
        setSlaHours(String(s.payment_instructions_sla_hours))
        setVerificationSeconds(String(s.payment_verification_seconds))
        setAutoConfirmEnabled(s.auto_confirm_enabled)
        setAutoConfirmMax(String(s.auto_confirm_max_amount))
        setAmountTolerance(String(s.amount_tolerance_baht))
        setRequireRefMatch(s.require_reference_match)
        setManualReviewMin(String(s.manual_review_min_amount))
        setLineSlipReceived(s.line_notify_slip_received)
        setLineConfirmed(s.line_notify_payment_confirmed)
        setLineRejected(s.line_notify_slip_rejected)
        setLineReviewPending(s.line_notify_review_pending)
        setBankMatchAuto(s.bank_match_auto_confirm_enabled)
        setBankMatchTolerance(String(s.bank_match_amount_tolerance_baht))
        setBankMatchLookback(String(s.bank_match_lookback_days))
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
  }, [])

  if (!canView) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const hours = Number(slaHours)
      if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
        throw new Error('SLA ต้องอยู่ระหว่าง 1–720 ชั่วโมง')
      }
      const verifySec = Number(verificationSeconds)
      if (!Number.isFinite(verifySec) || verifySec < 15 || verifySec > 600) {
        throw new Error('เวลาตรวจสลิปอัตโนมัติต้องอยู่ระหว่าง 15–600 วินาที')
      }
      const maxAuto = Number(autoConfirmMax)
      const tolerance = Number(amountTolerance)
      const manualMin = Number(manualReviewMin)
      if (!Number.isFinite(maxAuto) || maxAuto < 0) {
        throw new Error('ยอดสูงสุด auto-confirm ไม่ถูกต้อง')
      }
      if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 100) {
        throw new Error('ความคลาดเคลื่อนยอดต้องอยู่ระหว่าง 0–100 บาท')
      }
      if (!Number.isFinite(manualMin) || manualMin < 0) {
        throw new Error('เกณฑ์บังคับตรวจมือไม่ถูกต้อง')
      }
      const bankTol = Number(bankMatchTolerance)
      const bankLook = Number(bankMatchLookback)
      if (!Number.isFinite(bankTol) || bankTol < 0 || bankTol > 100) {
        throw new Error('ความคลาดเคลื่อนจับคู่ธนาคารต้องอยู่ระหว่าง 0–100 บาท')
      }
      if (!Number.isFinite(bankLook) || bankLook < 1 || bankLook > 90) {
        throw new Error('ช่วงวันย้อนหลังจับคู่ธนาคารต้องอยู่ระหว่าง 1–90 วัน')
      }
      await saveCompanyPaymentSettings({
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        promptpay_id: promptpayId.trim(),
        payment_instructions_sla_hours: Math.round(hours),
        payment_verification_seconds: Math.round(verifySec),
        auto_confirm_enabled: autoConfirmEnabled,
        auto_confirm_max_amount: Math.round(maxAuto),
        amount_tolerance_baht: tolerance,
        require_reference_match: requireRefMatch,
        manual_review_min_amount: Math.round(manualMin),
        line_notify_slip_received: lineSlipReceived,
        line_notify_payment_confirmed: lineConfirmed,
        line_notify_slip_rejected: lineRejected,
        line_notify_review_pending: lineReviewPending,
        bank_match_auto_confirm_enabled: bankMatchAuto,
        bank_match_amount_tolerance_baht: bankTol,
        bank_match_lookback_days: Math.round(bankLook),
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="payment-bank" className="card card--wide">
      <h2>บัญชีรับชำระเงิน</h2>
      <p className="muted settings-account__intro">
        ใช้บนหน้าส่งข้อมูลชำระเงิน ลิงก์สาธารณ์ /q และ QR PromptPay
      </p>

      {viewOnly ? (
        <p className="crm-banner">
          โหมดดูอย่างเดียว — แก้ไขได้เฉพาะ {formatRoleList(FINANCE_MANAGE_ROLES)}
        </p>
      ) : null}

      {loading ? <p className="muted">กำลังโหลด…</p> : null}

      {!loading ? (
        <fieldset
          disabled={viewOnly}
          style={{ border: 0, padding: 0, margin: 0 }}
        ><form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="task-field task-field--full">
            <span className="task-field__label">ธนาคาร</span>
            <input
              className="crm-input"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value)
                setSaved(false)
              }}
              required
            />
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">เลขบัญชี</span>
            <input
              className="crm-input"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value)
                setSaved(false)
              }}
              required
            />
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">ชื่อบัญชี</span>
            <input
              className="crm-input"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value)
                setSaved(false)
              }}
              required
            />
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">PromptPay (เลขนิติบุคคล)</span>
            <input
              className="crm-input"
              value={promptpayId}
              onChange={(e) => {
                setPromptpayId(e.target.value)
                setSaved(false)
              }}
              required
            />
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">SLA ส่งบัญชีหลังลูกค้ายอมรับ (ชั่วโมง)</span>
            <input
              className="crm-input"
              type="number"
              min={1}
              max={720}
              value={slaHours}
              onChange={(e) => {
                setSlaHours(e.target.value)
                setSaved(false)
              }}
              required
            />
            <span className="muted settings-field-hint">
              เกินกำหนดนี้จะแสดงคิวด่วนและแจ้งเตือนทีม (ครั้งเดียวต่อใบ)
            </span>
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">เวลาตรวจสลิปอัตโนมัติ (วินาที)</span>
            <input
              className="crm-input"
              type="number"
              min={15}
              max={600}
              value={verificationSeconds}
              onChange={(e) => {
                setVerificationSeconds(e.target.value)
                setSaved(false)
              }}
              required
            />
            <span className="muted settings-field-hint">
              หลังลูกค้าอัปโหลดสลิป ระบบ OCR แล้วตัดสิน — ถ้าไม่ทัน จะเข้าคิวมือหลังครบเวลานี้
            </span>
          </label>

          <h3 className="settings-form__subhead">ยืนยันชำระอัตโนมัติ (OCR)</h3>
          <p className="muted settings-field-hint" style={{ marginTop: 0 }}>
            ระบบจะอ่านสลิปอัตโนมัติ ถ้ายอด/ธนาคารตรงและ confidence สูง จะยืนยันเลย — ถ้าไม่ผ่านจะเข้าคิวตรวจมือ
          </p>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={autoConfirmEnabled}
              onChange={(e) => {
                setAutoConfirmEnabled(e.target.checked)
                setSaved(false)
              }}
            />
            <span>เปิดยืนยันชำระอัตโนมัติเมื่อสลิปผ่านเกณฑ์ (ต้องตั้ง SLIP_OCR_OPENAI_API_KEY บน Supabase)</span>
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">ยอดสูงสุดที่ auto-confirm ได้ (บาท)</span>
            <input
              className="crm-input"
              type="number"
              min={0}
              value={autoConfirmMax}
              onChange={(e) => {
                setAutoConfirmMax(e.target.value)
                setSaved(false)
              }}
              disabled={!autoConfirmEnabled}
            />
            <span className="muted settings-field-hint">
              ยอดเกินจำนวนนี้จะไม่ auto-confirm แต่จะเข้าคิวให้ทีมยืนยันด้วยตัวเอง
            </span>
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">ความคลาดเคลื่อนยอด (บาท)</span>
            <input
              className="crm-input"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={amountTolerance}
              onChange={(e) => {
                setAmountTolerance(e.target.value)
                setSaved(false)
              }}
              disabled={!autoConfirmEnabled}
            />
            <span className="muted settings-field-hint">
              ยอดบนสลิปเทียบกับใบเสนอราคา ต่างกันได้ไม่เกินค่านี้ (กันค่าธรรมเนียม / เศษสตางค์)
            </span>
          </label>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={requireRefMatch}
              onChange={(e) => {
                setRequireRefMatch(e.target.checked)
                setSaved(false)
              }}
              disabled={!autoConfirmEnabled}
            />
            <span>ต้องพบเลขที่ใบเสนอราคาบนสลิป (ยกเว้นเมื่อยอดไม่เกินเกณฑ์สูงสุด)</span>
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">ยอดขึ้นต้นบังคับตรวจมือ (บาท)</span>
            <input
              className="crm-input"
              type="number"
              min={0}
              value={manualReviewMin}
              onChange={(e) => {
                setManualReviewMin(e.target.value)
                setSaved(false)
              }}
              disabled={!autoConfirmEnabled}
            />
            <span className="muted settings-field-hint">
              ยอดเกินค่านี้ ระบบจะไม่ auto-confirm และส่งเข้าคิวตรวจมือเสมอ (กันยอดใหญ่)
            </span>
          </label>

          <h3 className="settings-form__subhead">จับคู่รายการเข้าบัญชี (เฟส 6d)</h3>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={bankMatchAuto}
              onChange={(e) => {
                setBankMatchAuto(e.target.checked)
                setSaved(false)
              }}
            />
            <span>ยืนยันชำระอัตโนมัติเมื่อจับคู่ธนาคารได้ confidence ≥ 90%</span>
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">ความคลาดเคลื่อนยอดจับคู่ธนาคาร (บาท)</span>
            <input
              className="crm-input"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={bankMatchTolerance}
              onChange={(e) => {
                setBankMatchTolerance(e.target.value)
                setSaved(false)
              }}
            />
            <span className="muted settings-field-hint">
              ระบบจับคู่ได้แม้ยอดบนสลิป/ธนาคารต่างจากใบเสนอราคา ±เท่านี้ (กันค่าธรรมเนียม / เศษสตางค์)
            </span>
          </label>
          <label className="task-field task-field--full">
            <span className="task-field__label">ย้อนหลังจับคู่ (วัน)</span>
            <input
              className="crm-input"
              type="number"
              min={1}
              max={90}
              value={bankMatchLookback}
              onChange={(e) => {
                setBankMatchLookback(e.target.value)
                setSaved(false)
              }}
            />
            <span className="muted settings-field-hint">
              ตอนจับคู่ จะมองหารายการชำระที่รอยืนยันย้อนหลังกี่วัน (ค่าทั่วไป 14–30 วัน)
            </span>
          </label>

          <h3 className="settings-form__subhead">แจ้งลูกค้าทาง LINE</h3>
          <p className="muted settings-field-hint" style={{ marginTop: 0 }}>
            ต้องตั้ง LINE_MESSAGING_CHANNEL_ACCESS_TOKEN บน Supabase — ถ้าไม่มีจะข้ามการ Push
          </p>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={lineSlipReceived}
              onChange={(e) => {
                setLineSlipReceived(e.target.checked)
                setSaved(false)
              }}
            />
            <span>เมื่อลูกค้าอัปโหลดสลิป (ได้รับสลิป · กำลังตรวจ)</span>
          </label>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={lineReviewPending}
              onChange={(e) => {
                setLineReviewPending(e.target.checked)
                setSaved(false)
              }}
            />
            <span>เมื่อสลิปเข้าคิวตรวจมือ (รอทีมยืนยัน)</span>
          </label>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={lineConfirmed}
              onChange={(e) => {
                setLineConfirmed(e.target.checked)
                setSaved(false)
              }}
            />
            <span>เมื่อยืนยันชำระเงินแล้ว (มือหรืออัตโนมัติ)</span>
          </label>
          <label className="task-field task-field--full settings-checkbox-row">
            <input
              type="checkbox"
              checked={lineRejected}
              onChange={(e) => {
                setLineRejected(e.target.checked)
                setSaved(false)
              }}
            />
            <span>เมื่อปฏิเสธสลิป (ขออัปโหลดใหม่)</span>
          </label>

          {error ? <p className="crm-error">{error}</p> : null}
          {saved ? <p className="phase2-banner--ok">บันทึกบัญชีรับชำระแล้ว</p> : null}

          {!viewOnly ? (
            <div className="settings-form__actions">
              <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'บันทึกบัญชีรับชำระ'}
              </button>
            </div>
          ) : null}
        </form>
        </fieldset>
      ) : null}
    </section>
  )
}
