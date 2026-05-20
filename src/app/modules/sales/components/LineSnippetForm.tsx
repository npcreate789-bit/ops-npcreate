import { useState, type FormEvent } from 'react'
import {
  LINE_SNIPPET_CATEGORY_LABELS,
  type LineMessageSnippet,
  type LineSnippetCategory,
  type LineSnippetInput,
} from '../../crm/types/lineSnippets'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import { LineSnippetPlaceholderHelp } from './LineSnippetPlaceholderHelp'

export interface LineSnippetFormValues {
  package_code: string
  category: LineSnippetCategory
  title: string
  body: string
  sort_order: string
  is_active: boolean
  valid_from: string
  valid_until: string
}

export function lineSnippetToFormValues(snippet?: LineMessageSnippet | null): LineSnippetFormValues {
  return {
    package_code: snippet?.package_code ?? '',
    category: snippet?.category ?? 'service_intro',
    title: snippet?.title ?? '',
    body: snippet?.body ?? '',
    sort_order: String(snippet?.sort_order ?? 0),
    is_active: snippet?.is_active ?? true,
    valid_from: snippet?.valid_from ?? '',
    valid_until: snippet?.valid_until ?? '',
  }
}

export function formValuesToLineSnippetInput(values: LineSnippetFormValues): LineSnippetInput {
  return {
    package_code: values.package_code ? values.package_code : null,
    category: values.category,
    title: values.title.trim(),
    body: values.body.trim(),
    sort_order: Number(values.sort_order) || 0,
    is_active: values.is_active,
    valid_from: values.valid_from.trim() || null,
    valid_until: values.valid_until.trim() || null,
  }
}

interface LineSnippetFormProps {
  serviceOptions: ServicePackageOption[]
  initial?: LineMessageSnippet | null
  defaultPackageCode?: string | null
  readOnly?: boolean
  saving?: boolean
  onSubmit: (input: LineSnippetInput) => void | Promise<void>
  onCancel: () => void
}

export function LineSnippetForm({
  serviceOptions,
  initial,
  defaultPackageCode,
  readOnly = false,
  saving = false,
  onSubmit,
  onCancel,
}: LineSnippetFormProps) {
  const [values, setValues] = useState<LineSnippetFormValues>(() => {
    const base = lineSnippetToFormValues(initial)
    if (!initial && defaultPackageCode) {
      return { ...base, package_code: defaultPackageCode }
    }
    return base
  })
  const [formError, setFormError] = useState<string | null>(null)

  const showSchedule = values.category === 'promotion'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!values.title.trim() || !values.body.trim()) {
      setFormError('กรอกชื่อการ์ดและเนื้อหาข้อความ')
      return
    }
    if (values.body.trim().length > 5000) {
      setFormError('ข้อความยาวเกิน 5,000 ตัวอักษร')
      return
    }
    if (values.valid_from && values.valid_until && values.valid_from > values.valid_until) {
      setFormError('วันเริ่มต้องไม่หลังวันสิ้นสุด')
      return
    }
    setFormError(null)
    await onSubmit(formValuesToLineSnippetInput(values))
  }

  return (
    <form className="crm-form line-snippet-form" onSubmit={(e) => void handleSubmit(e)}>
      <fieldset disabled={readOnly || saving} className="crm-form__grid">
        <label>
          แพ็กเกจ / หัวข้อ
          <select
            value={values.package_code}
            onChange={(e) => setValues({ ...values, package_code: e.target.value })}
            className="crm-select"
          >
            <option value="">ทั่วไป (ทุกบริการ)</option>
            {serviceOptions.map((pkg) => (
              <option key={pkg.code} value={pkg.code}>
                {pkg.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          ประเภท
          <select
            value={values.category}
            onChange={(e) =>
              setValues({ ...values, category: e.target.value as LineSnippetCategory })
            }
            className="crm-select"
          >
            {(Object.keys(LINE_SNIPPET_CATEGORY_LABELS) as LineSnippetCategory[]).map((key) => (
              <option key={key} value={key}>
                {LINE_SNIPPET_CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="crm-form__full">
          ชื่อการ์ด (สั้น)
          <input
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
            className="crm-input"
            maxLength={80}
            placeholder="เช่น โปร GMV Max มิ.ย."
          />
        </label>

        <label className="crm-form__full">
          เนื้อหาข้อความ LINE
          <textarea
            value={values.body}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
            className="crm-input"
            rows={8}
            maxLength={5000}
            placeholder="ข้อความที่จะใส่ในช่องแชทเมื่อกดการ์ด…"
          />
          <span className="crm-sub">{values.body.length} / 5000 ตัวอักษร</span>
        </label>

        <LineSnippetPlaceholderHelp
          onInsert={(token) =>
            setValues((v) => ({
              ...v,
              body: v.body ? `${v.body}${v.body.endsWith('\n') ? '' : ' '}${token}` : token,
            }))
          }
        />

        {showSchedule ? (
          <>
            <label>
              เริ่มแสดง (ไม่บังคับ)
              <input
                type="date"
                value={values.valid_from}
                onChange={(e) => setValues({ ...values, valid_from: e.target.value })}
                className="crm-input"
              />
            </label>
            <label>
              สิ้นสุด (ไม่บังคับ)
              <input
                type="date"
                value={values.valid_until}
                onChange={(e) => setValues({ ...values, valid_until: e.target.value })}
                className="crm-input"
              />
            </label>
            <p className="crm-form__full crm-sub muted">
              ใช้กับโปรโมชั่น — ว่างทั้งสองช่อง = แสดงตลอดเมื่อเปิดใช้งาน
            </p>
          </>
        ) : null}

        <label>
          ลำดับแสดง
          <input
            type="number"
            min={0}
            value={values.sort_order}
            onChange={(e) => setValues({ ...values, sort_order: e.target.value })}
            className="crm-input"
          />
        </label>

        <label className="crm-form__checkbox-row">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues({ ...values, is_active: e.target.checked })}
          />
          เปิดใช้งาน
        </label>
      </fieldset>

      {formError ? <p className="crm-error">{formError}</p> : null}

      <div className="crm-form__actions">
        <button type="button" className="crm-btn" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </button>
        {!readOnly ? (
          <button type="submit" className="crm-btn crm-btn--primary" disabled={saving}>
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        ) : null}
      </div>
    </form>
  )
}
