import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  FINANCE_MANAGE_ROLES,
  formatRoleList,
} from '../../../../shared/auth/access'
import type { CustomerOption, Payment, PaymentInput } from '../types'
import {
  PAYMENT_STATUS_OPTIONS,
  SERVICE_TYPES,
  calcPaymentTotals,
} from '../constants'
import '../../crm/crm.css'
import '../finance.css'

export interface PaymentFormState {
  customer_id: string
  quotation_id: string
  service_type: string
  amount: string
  vat_rate: string
  status: Payment['status']
  payment_date: string
  due_date: string
  notes: string
  issue_receipt: boolean
  issue_tax_invoice: boolean
}

function toState(initial?: Payment | null, preset?: CustomerOption | null): PaymentFormState {
  const amount = initial?.amount ?? preset?.quotation_total ?? 0
  return {
    customer_id: initial?.customer_id ?? preset?.id ?? '',
    quotation_id: initial?.quotation_id ?? preset?.quotation_id ?? '',
    service_type: initial?.service_type ?? 'gmv_max',
    amount: String(amount),
    vat_rate: '7',
    status: initial?.status ?? 'pending',
    payment_date: initial?.payment_date ?? '',
    due_date: initial?.due_date ?? '',
    notes: initial?.notes ?? '',
    issue_receipt: Boolean(initial?.receipt_number),
    issue_tax_invoice: Boolean(initial?.tax_invoice_number),
  }
}

interface PaymentFormProps {
  initial?: Payment | null
  preset?: CustomerOption | null
  customers: CustomerOption[]
  ownerId: string
  saving?: boolean
  readOnly?: boolean
  onSubmit: (input: PaymentInput) => void | Promise<void>
  onCancel: () => void
}

export function PaymentForm({
  initial,
  preset,
  customers,
  ownerId,
  saving,
  readOnly,
  onSubmit,
  onCancel,
}: PaymentFormProps) {
  const [state, setState] = useState<PaymentFormState>(() => toState(initial, preset))

  useEffect(() => {
    setState(toState(initial, preset))
  }, [initial?.id, initial?.updated_at, preset?.id, preset?.quotation_total])

  const totals = useMemo(() => {
    const amount = Number(state.amount) || 0
    const rate = Number(state.vat_rate) || 7
    return calcPaymentTotals(amount, rate)
  }, [state.amount, state.vat_rate])

  const blockPaidStatus =
    Boolean(
      initial?.quotation_id &&
        initial.status === 'pending' &&
        initial.slip_path &&
        initial.verification_status !== 'none',
    )

  const lockMoneyFields =
    initial != null &&
    (initial.verification_status === 'verifying' ||
      initial.verification_status === 'review_required')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!state.customer_id) return
    const input: PaymentInput = {
      customer_id: state.customer_id,
      quotation_id: state.quotation_id || null,
      recorded_by: ownerId,
      service_type: state.service_type,
      amount: Number(state.amount) || 0,
      vat_amount: totals.vat_amount,
      total_amount: totals.total_amount,
      status: state.status,
      payment_date: state.payment_date || null,
      due_date: state.due_date || null,
      notes: state.notes.trim() || null,
      issue_receipt: state.issue_receipt,
      issue_tax_invoice: state.issue_tax_invoice,
    }
    await onSubmit(input)
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      {readOnly && (
        <p className="crm-banner crm-banner--warn">
          โหมดดูอย่างเดียว — แก้ไขฟอร์มได้เฉพาะ {formatRoleList(FINANCE_MANAGE_ROLES)}
        </p>
      )}
      {!readOnly && lockMoneyFields && (
        <p className="crm-banner crm-banner--warn">
          กำลังตรวจสลิป — ล็อกยอด/วันที่ชำระจนกว่าจะยืนยันหรือปฏิเสธสลิป
        </p>
      )}
      {preset && (
        <p className="crm-banner">
          ลูกค้า: <strong>{preset.brand_name}</strong>
          {preset.quotation_total != null && (
            <> — ยอดใบเสนอราคา {preset.quotation_total.toLocaleString('th-TH')} บาท</>
          )}
        </p>
      )}

      <div className="qt-form__grid">
        {!preset && (
          <label>
            ลูกค้า <span className="req">*</span>
            <select
              required
              value={state.customer_id}
              onChange={(e) => setState({ ...state, customer_id: e.target.value })}
              className="crm-select"
              disabled={readOnly}
            >
              <option value="">— เลือกลูกค้า —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          ประเภทบริการ
          <select
            value={state.service_type}
            onChange={(e) => setState({ ...state, service_type: e.target.value })}
            className="crm-select"
            disabled={readOnly}
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          ยอดก่อน VAT (บาท)
          <input
            type="number"
            min={0}
            required
            value={state.amount}
            onChange={(e) => setState({ ...state, amount: e.target.value })}
            className="crm-input"
            disabled={readOnly || lockMoneyFields}
          />
        </label>
        <label>
          VAT (%)
          <input
            type="number"
            min={0}
            value={state.vat_rate}
            onChange={(e) => setState({ ...state, vat_rate: e.target.value })}
            className="crm-input"
            disabled={readOnly || lockMoneyFields}
          />
        </label>
        <label>
          สถานะ
          <select
            value={state.status}
            onChange={(e) =>
              setState({ ...state, status: e.target.value as Payment['status'] })
            }
            className="crm-select"
            disabled={readOnly}
          >
            {PAYMENT_STATUS_OPTIONS.filter(
              (o) => !(blockPaidStatus && o.value === 'paid'),
            ).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          วันที่ชำระ
          <input
            type="date"
            value={state.payment_date}
            onChange={(e) => setState({ ...state, payment_date: e.target.value })}
            className="crm-input"
            disabled={readOnly || lockMoneyFields}
          />
        </label>
        <label>
          ครบกำหนดรอบถัดไป
          <input
            type="date"
            value={state.due_date}
            onChange={(e) => setState({ ...state, due_date: e.target.value })}
            className="crm-input"
            disabled={readOnly}
          />
        </label>
        <label className="qt-form__full">
          หมายเหตุ
          <textarea
            rows={2}
            value={state.notes}
            onChange={(e) => setState({ ...state, notes: e.target.value })}
            className="crm-input"
            disabled={readOnly}
          />
        </label>
        <div className="qt-form__full finance-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={state.issue_receipt}
              disabled={readOnly}
              onChange={(e) => setState({ ...state, issue_receipt: e.target.checked })}
            />
            ออกใบเสร็จ
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.issue_tax_invoice}
              disabled={readOnly}
              onChange={(e) => setState({ ...state, issue_tax_invoice: e.target.checked })}
            />
            ออกใบกำกับภาษี
          </label>
        </div>
      </div>

      <div className="qt-totals">
        <dl>
          <dt>VAT</dt>
          <dd>{totals.vat_amount.toLocaleString('th-TH')} บาท</dd>
          <dt className="qt-totals__total">รวมชำระ</dt>
          <dd className="qt-totals__total">{totals.total_amount.toLocaleString('th-TH')} บาท</dd>
        </dl>
      </div>

      <div className="crm-form__actions">
        <button type="button" className="crm-btn crm-btn--ghost" onClick={onCancel}>
          ยกเลิก
        </button>
        <button
          type="submit"
          className="crm-btn crm-btn--primary"
          disabled={saving || readOnly || lockMoneyFields}
          title={lockMoneyFields ? 'รอผลตรวจสลิปก่อนแก้ยอด/วันที่' : undefined}
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </form>
  )
}
