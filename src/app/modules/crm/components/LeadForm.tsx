import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Lead, LeadInsert, LeadUpdate } from '../types'
import {
  datetimeLocalBangkokToIso,
  isoToDatetimeLocalBangkok,
} from '../../../../shared/dates/bangkok'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import { normalizeServiceInterestCodes } from '../../../../shared/packages/serviceInterests'
import {
  BUSINESS_TYPES,
  LEAD_CHANNEL_OPTIONS,
  LEAD_STATUS_OPTIONS,
} from '../constants'
import '../crm.css'

export interface LeadFormValues {
  brand_name: string
  contact_name: string
  phone: string
  line_id: string
  facebook: string
  business_type: string
  ad_budget_daily: string
  ad_budget_monthly: string
  pain_points: string
  services_interested: string[]
  status: Lead['status']
  channel: Lead['channel']
  shop_links: string
  notes: string
  reminder_at: string
}

function toFormValues(
  lead: Lead | null | undefined,
  serviceOptions: ServicePackageOption[],
): LeadFormValues {
  return {
    brand_name: lead?.brand_name ?? '',
    contact_name: lead?.contact_name ?? '',
    phone: lead?.phone ?? '',
    line_id: lead?.line_id ?? '',
    facebook: lead?.facebook ?? '',
    business_type: lead?.business_type ?? '',
    ad_budget_daily: lead?.ad_budget_daily?.toString() ?? '',
    ad_budget_monthly: lead?.ad_budget_monthly?.toString() ?? '',
    pain_points: lead?.pain_points ?? '',
    services_interested: normalizeServiceInterestCodes(
      lead?.services_interested ?? [],
      serviceOptions,
    ),
    status: lead?.status ?? 'interested',
    channel: lead?.channel ?? 'other',
    shop_links: lead?.shop_links ?? '',
    notes: lead?.notes ?? '',
    reminder_at: isoToDatetimeLocalBangkok(lead?.reminder_at),
  }
}

function hasLeadDetailContent(values: LeadFormValues): boolean {
  return Boolean(
    values.pain_points.trim() || values.shop_links.trim() || values.notes.trim(),
  )
}

function toPayloadFields(values: LeadFormValues) {
  return {
    brand_name: values.brand_name.trim(),
    contact_name: values.contact_name.trim() || null,
    phone: values.phone.trim() || null,
    line_id: values.line_id.trim() || null,
    facebook: values.facebook.trim() || null,
    business_type: values.business_type || null,
    ad_budget_daily: values.ad_budget_daily ? Number(values.ad_budget_daily) : null,
    ad_budget_monthly: values.ad_budget_monthly ? Number(values.ad_budget_monthly) : null,
    pain_points: values.pain_points.trim() || null,
    services_interested: values.services_interested,
    status: values.status,
    channel: values.channel,
    shop_links: values.shop_links.trim() || null,
    notes: values.notes.trim() || null,
    reminder_at: datetimeLocalBangkokToIso(values.reminder_at),
  }
}

export function formValuesToPayload(
  values: LeadFormValues,
  ownerId: string,
): LeadInsert {
  return {
    owner_id: ownerId,
    preferred_contact_channel: null,
    ...toPayloadFields(values),
  }
}

export function formValuesToUpdate(values: LeadFormValues): LeadUpdate {
  return toPayloadFields(values)
}

interface LeadFormProps {
  initial?: Lead | null
  serviceOptions: ServicePackageOption[]
  saving?: boolean
  readOnly?: boolean
  onSubmit: (values: LeadFormValues) => void | Promise<void>
  onCancel: () => void
}

export function LeadForm({
  initial,
  serviceOptions,
  saving,
  readOnly = false,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(() =>
    toFormValues(initial, serviceOptions),
  )
  const [detailOpen, setDetailOpen] = useState(() =>
    hasLeadDetailContent(toFormValues(initial, serviceOptions)),
  )

  useEffect(() => {
    if (initial) {
      const next = toFormValues(initial, serviceOptions)
      setValues(next)
      if (hasLeadDetailContent(next)) setDetailOpen(true)
    }
  }, [initial, serviceOptions])

  function toggleService(code: string) {
    if (readOnly) return
    setValues((v) => ({
      ...v,
      services_interested: v.services_interested.includes(code)
        ? v.services_interested.filter((s) => s !== code)
        : [...v.services_interested, code],
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!values.brand_name.trim()) return
    await onSubmit(values)
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly} className="crm-form__grid">
        <label>
          ชื่อแบรนด์ / ร้าน <span className="req">*</span>
          <input
            required
            value={values.brand_name}
            onChange={(e) => setValues({ ...values, brand_name: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          ชื่อผู้ติดต่อ
          <input
            value={values.contact_name}
            onChange={(e) => setValues({ ...values, contact_name: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          เบอร์โทร
          <input
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          Line ID
          <input
            value={values.line_id}
            onChange={(e) => setValues({ ...values, line_id: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          Facebook
          <input
            value={values.facebook}
            onChange={(e) => setValues({ ...values, facebook: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          ประเภทธุรกิจ
          <select
            value={values.business_type}
            onChange={(e) => setValues({ ...values, business_type: e.target.value })}
            className="crm-select"
          >
            <option value="">— เลือก —</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          ช่องทางที่มา
          <select
            value={values.channel}
            onChange={(e) =>
              setValues({ ...values, channel: e.target.value as Lead['channel'] })
            }
            className="crm-select"
          >
            {LEAD_CHANNEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          สถานะ
          <select
            value={values.status}
            onChange={(e) =>
              setValues({ ...values, status: e.target.value as Lead['status'] })
            }
            className="crm-select"
          >
            {LEAD_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          งบแอด / วัน (บาท)
          <input
            type="number"
            min={0}
            value={values.ad_budget_daily}
            onChange={(e) => setValues({ ...values, ad_budget_daily: e.target.value })}
            className="crm-input"
          />
        </label>
        <label>
          งบแอด / เดือน (บาท)
          <input
            type="number"
            min={0}
            value={values.ad_budget_monthly}
            onChange={(e) => setValues({ ...values, ad_budget_monthly: e.target.value })}
            className="crm-input"
          />
        </label>
        <label className="crm-form__full">
          บริการที่สนใจ
          <span className="crm-sub">
            รหัสแพ็กเกจจาก{' '}
            <Link to="/app/sales/packages" className="crm-inline-link">
              จัดการแพ็กเกจบริการ
            </Link>
            — ตรงกับฟอร์มติดต่อและใบเสนอราคา
          </span>
          <div className="crm-chips">
            {serviceOptions.map((pkg) => (
              <button
                key={pkg.code}
                type="button"
                className={
                  values.services_interested.includes(pkg.code)
                    ? 'crm-chip crm-chip--on'
                    : 'crm-chip'
                }
                onClick={() => toggleService(pkg.code)}
                title={pkg.code}
              >
                {pkg.name}
              </button>
            ))}
          </div>
        </label>
      </fieldset>

      <details
        className="crm-form__optional crm-form__full"
        open={detailOpen}
        onToggle={(e) => setDetailOpen(e.currentTarget.open)}
      >
        <summary className="crm-form__optional-summary">
          รายละเอียดเพิ่มเติม (ไม่บังคับ)
        </summary>
        <div className="crm-form__optional-body crm-form__grid">
          <label className="crm-form__full">
            ปัญหา / Pain points
            <span className="crm-sub">กรอกหลังคุยลูกค้า หรือจากบรีฟใน Client Workspace</span>
            <textarea
              rows={2}
              value={values.pain_points}
              onChange={(e) => setValues({ ...values, pain_points: e.target.value })}
              className="crm-input"
            />
          </label>
          <label className="crm-form__full">
            ลิงก์ร้าน / TikTok Shop / เพจ
            <textarea
              rows={2}
              value={values.shop_links}
              onChange={(e) => setValues({ ...values, shop_links: e.target.value })}
              className="crm-input"
              placeholder="วางลิงก์ได้หลายบรรทัด"
            />
          </label>
          <label className="crm-form__full">
            บันทึกเพิ่มเติม
            <textarea
              rows={3}
              value={values.notes}
              onChange={(e) => setValues({ ...values, notes: e.target.value })}
              className="crm-input"
            />
          </label>
        </div>
      </details>

      <fieldset disabled={readOnly} className="crm-form__grid">
        <label>
          Reminder ติดตาม
          <input
            type="datetime-local"
            value={values.reminder_at}
            onChange={(e) => setValues({ ...values, reminder_at: e.target.value })}
            className="crm-input"
          />
        </label>
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
