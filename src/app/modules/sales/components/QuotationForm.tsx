import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatServiceInterests } from '../../../../shared/packages/serviceInterests'
import type { Package, Quotation, QuotationInput, QuotationStatus } from '../types'
import {
  DEFAULT_TERMS,
  QUOTATION_STATUS_OPTIONS,
  calcQuotationTotals,
} from '../constants'
import {
  DEFAULT_CONTRACT_MONTHS,
  lineUnitPriceForContract,
  parseContractMonths,
} from '../quotationPricing'
import '../sales.css'

export interface QuotationFormState {
  lead_id: string
  status: QuotationStatus
  discount: string
  vat_rate: string
  contract_months: string
  terms: string
  notes: string
  items: {
    package_id: string
    description: string
    quantity: string
    unit_price: string
  }[]
}

function defaultItemFromPackage(pkg: Package, contractMonths = DEFAULT_CONTRACT_MONTHS) {
  return {
    package_id: pkg.id,
    description: pkg.name,
    quantity: '1',
    unit_price: String(lineUnitPriceForContract(pkg.base_price, contractMonths)),
  }
}

function toState(
  initial?: Quotation | null,
  leadId?: string,
  suggestedPackage?: Package | null,
  fromLeadSave?: boolean,
): QuotationFormState {
  const base = {
    lead_id: initial?.lead_id ?? leadId ?? '',
    status: initial?.status ?? (fromLeadSave ? 'sent' : 'draft'),
    discount: String(initial?.discount ?? 0),
    vat_rate: String(initial?.vat_rate ?? 7),
    contract_months: initial?.contract_months
      ? String(initial.contract_months)
      : String(DEFAULT_CONTRACT_MONTHS),
    terms: initial?.terms ?? DEFAULT_TERMS,
    notes: initial?.notes ?? '',
  }

  if (initial?.items?.length) {
    return {
      ...base,
      items: initial.items.map((i) => ({
        package_id: i.package_id ?? '',
        description: i.description,
        quantity: String(i.quantity),
        unit_price: String(i.unit_price),
      })),
    }
  }

  if (suggestedPackage) {
    const months = parseContractMonths(base.contract_months)
    return { ...base, items: [defaultItemFromPackage(suggestedPackage, months)] }
  }

  return {
    ...base,
    items: [{ package_id: '', description: '', quantity: '1', unit_price: '0' }],
  }
}

export function stateToInput(state: QuotationFormState, ownerId: string): QuotationInput {
  return {
    lead_id: state.lead_id || null,
    owner_id: ownerId,
    status: state.status,
    discount: Number(state.discount) || 0,
    vat_rate: Number(state.vat_rate) || 7,
    contract_months: state.contract_months ? Number(state.contract_months) : null,
    terms: state.terms.trim() || null,
    notes: state.notes.trim() || null,
    items: state.items
      .filter((i) => i.description.trim())
      .map((item, idx) => ({
        package_id: item.package_id || null,
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        sort_order: idx,
      })),
  }
}

interface QuotationFormProps {
  initial?: Quotation | null
  leadId?: string
  leadBrandName?: string
  leadServiceCodes?: string[]
  suggestedPackage?: Package | null
  ownerId: string
  packages: Package[]
  saving?: boolean
  readOnly?: boolean
  /** มาจาก CRM หลังบันทึก Lead */
  fromLeadSave?: boolean
  onSubmit: (input: QuotationInput) => void | Promise<void>
  onCancel: () => void
}

export function QuotationForm({
  initial,
  leadId,
  leadBrandName,
  leadServiceCodes = [],
  suggestedPackage,
  ownerId,
  packages,
  saving,
  readOnly = false,
  fromLeadSave = false,
  onSubmit,
  onCancel,
}: QuotationFormProps) {
  const serviceOptions = useMemo(
    () => packages.filter((p) => p.is_active).map((p) => ({ code: p.code, name: p.name })),
    [packages],
  )

  const [state, setState] = useState<QuotationFormState>(() =>
    toState(initial, leadId, suggestedPackage, fromLeadSave),
  )

  useEffect(() => {
    if (initial) setState(toState(initial, leadId, undefined, fromLeadSave))
  }, [initial, leadId, fromLeadSave])

  useEffect(() => {
    if (initial?.items?.length) return
    if (!suggestedPackage) return
    setState((current) => {
      const first = current.items[0]
      if (first?.package_id || first?.description.trim()) return current
      return toState(undefined, leadId, suggestedPackage)
    })
  }, [initial, suggestedPackage, leadId])

  const totals = useMemo(() => {
    const items = state.items.map((i) => ({
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
    }))
    return calcQuotationTotals(
      items,
      Number(state.discount) || 0,
      Number(state.vat_rate) || 7,
    )
  }, [state])

  function setItem(index: number, patch: Partial<QuotationFormState['items'][0]>) {
    setState((s) => {
      const items = [...s.items]
      items[index] = { ...items[index], ...patch }
      return { ...s, items }
    })
  }

  function addLine() {
    if (readOnly) return
    setState((s) => ({
      ...s,
      items: [...s.items, { package_id: '', description: '', quantity: '1', unit_price: '0' }],
    }))
  }

  function removeLine(index: number) {
    if (readOnly) return
    setState((s) => ({
      ...s,
      items: s.items.length > 1 ? s.items.filter((_, i) => i !== index) : s.items,
    }))
  }

  function applyContractMonthsToLineItems(
    items: QuotationFormState['items'],
    monthsRaw: string,
  ): QuotationFormState['items'] {
    const months = parseContractMonths(monthsRaw)
    return items.map((item) => {
      if (!item.package_id) return item
      const pkg = packages.find((p) => p.id === item.package_id)
      if (!pkg) return item
      return {
        ...item,
        unit_price: String(lineUnitPriceForContract(pkg.base_price, months)),
      }
    })
  }

  function setContractMonths(value: string) {
    setState((s) => ({
      ...s,
      contract_months: value,
      items: applyContractMonthsToLineItems(s.items, value),
    }))
  }

  function pickPackage(index: number, packageId: string) {
    const pkg = packages.find((p) => p.id === packageId)
    const months = parseContractMonths(state.contract_months)
    setItem(index, {
      package_id: packageId,
      description: pkg?.name ?? '',
      unit_price: pkg
        ? String(lineUnitPriceForContract(pkg.base_price, months))
        : '0',
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    await onSubmit(stateToInput(state, ownerId))
  }

  return (
    <form className="crm-form qt-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly}>
      {fromLeadSave && leadId && (
        <p className="crm-banner crm-banner--ok qt-form__flow-banner">
          บันทึก Lead แล้ว — กรอกใบเสนอราคาด้านล่าง แล้วกด <strong>บันทึก</strong> เพื่อส่งลิงก์/ไฟล์ใบเสนอราคาไปแชท LINE
        </p>
      )}

      {leadBrandName && (
        <p className="crm-banner crm-banner--warn">
          Lead: <strong>{leadBrandName}</strong>
          {leadId && (
            <>
              {' '}
              ·{' '}
              <Link to={`/app/crm/${leadId}`} className="crm-inline-link">
                เปิด Lead
              </Link>
            </>
          )}
          {leadServiceCodes.length > 0 && (
            <span className="crm-sub" style={{ display: 'block', marginTop: '0.35rem' }}>
              บริการที่สนใจ: {formatServiceInterests(leadServiceCodes, serviceOptions)}
            </span>
          )}
        </p>
      )}

      <div className="qt-form__grid">
        <label>
          สถานะใบเสนอราคา
          <select
            value={state.status}
            onChange={(e) =>
              setState({ ...state, status: e.target.value as QuotationStatus })
            }
            className="crm-select"
          >
            {QUOTATION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          ระยะสัญญา (เดือน)
          <span className="crm-sub">
            ราคา/หน่วยของแพ็กเกจ = ราคาต่อเดือน × จำนวนเดือน (อัปเดตอัตโนมัติ)
          </span>
          <input
            type="number"
            min={1}
            value={state.contract_months}
            onChange={(e) => setContractMonths(e.target.value)}
            className="crm-input"
          />
        </label>
        <label>
          ส่วนลด (บาท)
          <input
            type="number"
            min={0}
            value={state.discount}
            onChange={(e) => setState({ ...state, discount: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          VAT (%)
          <input
            type="number"
            min={0}
            max={100}
            value={state.vat_rate}
            onChange={(e) => setState({ ...state, vat_rate: e.target.value })}
            className="crm-input"
          />
        </label>
        <label className="qt-form__full">
          เงื่อนไข
          <textarea
            rows={2}
            value={state.terms}
            onChange={(e) => setState({ ...state, terms: e.target.value })}
            className="crm-input"
          />
        </label>
        <label className="qt-form__full">
          หมายเหตุ
          <textarea
            rows={2}
            value={state.notes}
            onChange={(e) => setState({ ...state, notes: e.target.value })}
            className="crm-input"
          />
        </label>
      </div>

      <div className="qt-form__full">
        <h3 className="crm-section-title">
          รายการบริการ{' '}
          <Link to="/app/sales/packages" className="crm-sub">
            · จัดการแพ็กเกจ
          </Link>
        </h3>
        {packages.length === 0 && (
          <p className="crm-banner crm-banner--warn">
            ยังไม่มีแพ็กเกจในระบบ —{' '}
            <Link to="/app/sales/packages">จัดการแพ็กเกจ</Link>
            หรือรัน migration บน Supabase
          </p>
        )}
        <div className="qt-lines">
          {state.items.map((item, index) => (
            <div key={index} className="qt-line">
              <label>
                แพ็กเกจ
                <select
                  value={item.package_id}
                  onChange={(e) => pickPackage(index, e.target.value)}
                  className="crm-select"
                >
                  <option value="">กำหนดเอง</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.base_price.toLocaleString('th-TH')} บาท
                    </option>
                  ))}
                </select>
              </label>
              <label>
                จำนวน
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => setItem(index, { quantity: e.target.value })}
                  className="crm-input"
                />
              </label>
              <label>
                ราคา/หน่วย
                <span className="crm-sub">
                  {item.package_id
                    ? `รวม ${parseContractMonths(state.contract_months)} เดือน`
                    : 'กำหนดเอง'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={item.unit_price}
                  onChange={(e) => setItem(index, { unit_price: e.target.value })}
                  className="crm-input"
                />
              </label>
              <button
                type="button"
                className="crm-btn crm-btn--ghost"
                onClick={() => removeLine(index)}
                aria-label="ลบรายการ"
              >
                ×
              </button>
              <label className="qt-form__full">
                รายละเอียด
                <input
                  value={item.description}
                  onChange={(e) => setItem(index, { description: e.target.value })}
                  className="crm-input"
                  required
                />
              </label>
            </div>
          ))}
        </div>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={addLine}>
          + เพิ่มรายการ
        </button>
      </div>

      <div className="qt-totals">
        <dl>
          <dt>ยอดรวม</dt>
          <dd>{totals.subtotal.toLocaleString('th-TH')} บาท</dd>
          <dt>VAT</dt>
          <dd>{totals.vat_amount.toLocaleString('th-TH')} บาท</dd>
          <dt className="qt-totals__total">รวมทั้งสิ้น</dt>
          <dd className="qt-totals__total">{totals.total.toLocaleString('th-TH')} บาท</dd>
        </dl>
      </div>
      </fieldset>

      <div className="crm-form__actions">
        <button type="button" className="crm-btn crm-btn--ghost" onClick={onCancel}>
          {readOnly ? 'กลับ' : 'ยกเลิก'}
        </button>
        {!readOnly && (
          <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        )}
      </div>
    </form>
  )
}
