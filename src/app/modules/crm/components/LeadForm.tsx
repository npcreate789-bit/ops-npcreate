import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Lead, LeadInsert, LeadUpdate } from '../types'
import {
  BANGKOK_TZ,
  datetimeLocalBangkokToIso,
  formatBangkokDateTime,
  isoToDatetimeLocalBangkok,
} from '../../../../shared/dates/bangkok'
import { preferredContactChannelLabel } from '../../../../shared/crm/preferredContactChannel'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import { normalizeServiceInterestCodes } from '../../../../shared/packages/serviceInterests'
import {
  BUSINESS_TYPES,
  LEAD_CHANNEL_OPTIONS,
  LEAD_STATUS_OPTIONS,
} from '../constants'
import '../crm.css'

export interface LeadFormValues {
  contact_name: string
  phone: string
  business_type: string
  ad_budget_monthly: string
  pain_points: string
  services_interested: string[]
  status: Lead['status']
  channel: Lead['channel']
  shop_links: string
  notes: string
  reminder_at: string
}

const REMINDER_PRESETS = [
  { id: 'tomorrow', label: 'พรุ่งนี้ 10:00', days: 1, hour: 10 },
  { id: '3days', label: 'อีก 3 วัน', days: 3, hour: 10 },
  { id: 'week', label: 'อีก 7 วัน', days: 7, hour: 10 },
] as const

function reminderPresetDatetimeLocal(daysFromNow: number, hourBangkok = 10): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + daysFromNow * 86_400_000))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((p) => p.type === type)?.value ?? ''
  const pad = (n: string) => n.padStart(2, '0')
  return `${get('year')}-${pad(get('month'))}-${pad(get('day'))}T${pad(String(hourBangkok))}:00`
}

function toFormValues(
  lead: Lead | null | undefined,
  serviceOptions: ServicePackageOption[],
): LeadFormValues {
  return {
    contact_name: lead?.contact_name?.trim() || lead?.brand_name?.trim() || '',
    phone: lead?.phone ?? '',
    business_type: lead?.business_type ?? '',
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

/** ฟิลด์ที่แก้ในฟอร์ม — ไม่รวม line_id/facebook/line_user_id (ตั้งจากฟอร์มติดต่อหรือแผง LINE) */
function toPayloadFields(values: LeadFormValues) {
  const name = values.contact_name.trim()
  return {
    brand_name: name,
    contact_name: name || null,
    phone: values.phone.trim() || null,
    business_type: values.business_type || null,
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
    line_user_id: null,
    line_oa_chat_user_id: null,
    facebook_psid: null,
    ad_budget_daily: null,
    line_id: null,
    facebook: null,
    ...toPayloadFields(values),
  }
}

export function formValuesToUpdate(values: LeadFormValues): LeadUpdate {
  return toPayloadFields(values)
}

interface LeadFormProps {
  initial?: Lead | null
  serviceOptions: ServicePackageOption[]
  servicesInterested?: string[]
  onServicesInterestedChange?: (codes: string[]) => void
  saving?: boolean
  readOnly?: boolean
  submitLabel?: string
  onSubmit: (values: LeadFormValues) => void | Promise<void>
  secondarySubmitLabel?: string
  onSecondarySubmit?: (values: LeadFormValues) => void | Promise<void>
  onCancel: () => void
}

export function LeadForm({
  initial,
  serviceOptions,
  servicesInterested: servicesInterestedProp,
  onServicesInterestedChange,
  saving,
  readOnly = false,
  submitLabel = 'บันทึก',
  onSubmit,
  secondarySubmitLabel,
  onSecondarySubmit,
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

  const servicesInterested =
    servicesInterestedProp ?? values.services_interested

  function setServicesInterested(codes: string[]) {
    if (onServicesInterestedChange) onServicesInterestedChange(codes)
    setValues((v) => ({ ...v, services_interested: codes }))
  }

  function toggleService(code: string) {
    if (readOnly) return
    const next = servicesInterested.includes(code)
      ? servicesInterested.filter((s) => s !== code)
      : [...servicesInterested, code]
    setServicesInterested(next)
  }

  const fromContactForm =
    Boolean(initial?.preferred_contact_channel) && initial?.channel === 'website'
  const reminderIso = datetimeLocalBangkokToIso(values.reminder_at)
  const reminderOverdue =
    reminderIso && new Date(reminderIso) <= new Date() && values.status !== 'won'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!values.contact_name.trim()) return
    await onSubmit(values)
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly} className="crm-form__grid">
        <label className="crm-form__full">
          ชื่อผู้ติดต่อ / ร้าน <span className="req">*</span>
          <span className="crm-sub">ใช้แสดงในรายการ CRM และแจ้งเตือน (แทนช่องแบรนด์แยก)</span>
          <input
            required
            value={values.contact_name}
            onChange={(e) => setValues({ ...values, contact_name: e.target.value })}
            className="crm-input"
            placeholder="เช่น ร้าน ABC / คุณสมชาย"
          />
        </label>
        <label>
          เบอร์โทร
          <input
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            className="crm-input"
            inputMode="tel"
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
                  servicesInterested.includes(pkg.code)
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

      <fieldset disabled={readOnly} className="crm-form__section crm-form__full">
        <legend className="crm-form__section-title">แหล่งที่มา &amp; ติดตาม</legend>
        <p className="crm-form__section-hint muted">
          แยกจากช่องทางติดต่อกลับ (LINE / Facebook) ที่ลูกค้าเลือกในฟอร์มติดต่อ — ดูและเปิดแชทได้ที่แผงด้านบน
        </p>

        {initial?.preferred_contact_channel ? (
          <p className="crm-form__readonly-channel">
            ลูกค้าเลือกให้ติดต่อกลับทาง{' '}
            <strong>{preferredContactChannelLabel(initial.preferred_contact_channel)}</strong>
            {fromContactForm ? (
              <span className="crm-sub"> · ส่งจากฟอร์ม /contact</span>
            ) : null}
          </p>
        ) : null}

        <div className="crm-form__field-block">
          <span className="crm-form__field-label">แหล่งที่มา (การตลาด)</span>
          <span className="crm-sub">ลูกค้ารู้จัก NP Create จากช่องทางไหน — ใช้กรองรายงาน CRM</span>
          <div className="crm-chips crm-chips--channel" role="group" aria-label="แหล่งที่มา">
            {LEAD_CHANNEL_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={
                  values.channel === o.value ? 'crm-chip crm-chip--on' : 'crm-chip'
                }
                aria-pressed={values.channel === o.value}
                onClick={() => setValues({ ...values, channel: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
          {fromContactForm && values.channel === 'website' ? (
            <p className="crm-sub">
              ค่าเริ่มต้นจากฟอร์มเว็บ — ปรับเป็น TikTok / Facebook Ads ฯลฯ หลังคุยลูกค้าแล้ว
            </p>
          ) : null}
        </div>

        <div className="crm-form__field-block">
          <span className="crm-form__field-label">นัดติดตามครั้งถัดไป</span>
          <span className="crm-sub">
            แจ้งเตือนใน Dashboard และไฮไลต์แถว CRM เมื่อถึงเวลา
            {values.status === 'follow_up' ? ' — แนะนำตั้งเมื่อสถานะ “ติดตามใหม่”' : ''}
          </span>
          <div className="crm-reminder-presets">
            {REMINDER_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="crm-chip"
                onClick={() =>
                  setValues({
                    ...values,
                    reminder_at: reminderPresetDatetimeLocal(p.days, p.hour),
                  })
                }
              >
                {p.label}
              </button>
            ))}
            {values.reminder_at ? (
              <button
                type="button"
                className="crm-chip crm-chip--ghost"
                onClick={() => setValues({ ...values, reminder_at: '' })}
              >
                ล้างนัด
              </button>
            ) : null}
          </div>
          <input
            type="datetime-local"
            value={values.reminder_at}
            onChange={(e) => setValues({ ...values, reminder_at: e.target.value })}
            className="crm-input"
          />
          {values.reminder_at ? (
            <p
              className={
                reminderOverdue ? 'crm-reminder-status crm-reminder-status--due' : 'crm-reminder-status'
              }
            >
              {reminderOverdue ? 'ถึงเวลาติดตามแล้ว' : 'นัดติดตาม'}:{' '}
              {formatBangkokDateTime(reminderIso)}
            </p>
          ) : (
            <p className="crm-sub">ยังไม่ตั้งนัด — เลือกปุ่มลัดหรือระบุวันเวลา</p>
          )}
        </div>
      </fieldset>

      <div className="crm-form__actions">
        <button type="button" className="crm-btn crm-btn--ghost" onClick={onCancel}>
          {readOnly ? 'กลับ' : 'ยกเลิก'}
        </button>
        {!readOnly && (
          <>
            <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
              {saving ? 'กำลังดำเนินการ…' : submitLabel}
            </button>
            {secondarySubmitLabel && onSecondarySubmit ? (
              <button
                type="button"
                className="crm-btn crm-btn--ghost"
                disabled={saving}
                onClick={() => {
                  if (!values.contact_name.trim()) return
                  void onSecondarySubmit(values)
                }}
              >
                {saving ? 'กำลังดำเนินการ…' : secondarySubmitLabel}
              </button>
            ) : null}
          </>
        )}
      </div>
    </form>
  )
}
