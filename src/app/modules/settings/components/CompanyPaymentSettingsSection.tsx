import { useEffect, useState, type FormEvent } from 'react'
import { canManageFinance } from '../../../../shared/auth/access'
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [promptpayId, setPromptpayId] = useState('')
  const [slaHours, setSlaHours] = useState('48')

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

  if (!canEdit) return null

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
      await saveCompanyPaymentSettings({
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        promptpay_id: promptpayId.trim(),
        payment_instructions_sla_hours: Math.round(hours),
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

      {loading ? <p className="muted">กำลังโหลด…</p> : null}

      {!loading ? (
        <form className="settings-form" onSubmit={(e) => void handleSubmit(e)}>
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

          {error ? <p className="crm-error">{error}</p> : null}
          {saved ? <p className="phase2-banner--ok">บันทึกบัญชีรับชำระแล้ว</p> : null}

          <div className="settings-form__actions">
            <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึกบัญชีรับชำระ'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
