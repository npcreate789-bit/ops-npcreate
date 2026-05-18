import { useEffect, useState, type FormEvent } from 'react'
import type { Package, PackageInput } from '../types'
import '../../crm/crm.css'

interface Props {
  initial?: Package | null
  saving?: boolean
  readOnly?: boolean
  onSubmit: (input: PackageInput) => void | Promise<void>
  onCancel: () => void
}

function toState(initial?: Package | null) {
  return {
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    base_price: initial?.base_price?.toString() ?? '0',
    is_active: initial?.is_active ?? true,
  }
}

export function PackageForm({
  initial,
  saving,
  readOnly = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState(() => toState(initial))

  useEffect(() => {
    setForm(toState(initial))
  }, [initial])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly || !form.code.trim() || !form.name.trim()) return
    onSubmit({
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      base_price: Number(form.base_price) || 0,
      is_active: form.is_active,
    })
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly} className="crm-form__grid">
        <label>
          รหัส (code) *
          <input
            className="crm-input"
            required
            pattern="[a-z0-9_]+"
            title="ตัวพิมพ์เล็ก a-z, ตัวเลข, _ เท่านั้น"
            value={form.code}
            onChange={(e) =>
              setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, '_') }))
            }
          />
          <span className="crm-sub">
            เช่น gmv_max — ใช้ใน /contact, CRM (บริการที่สนใจ) และใบเสนอราคา ไม่ซ้ำกัน
          </span>
        </label>
        <label>
          ชื่อแพ็กเกจ *
          <input
            className="crm-input"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="crm-form__full">
          รายละเอียด
          <textarea
            className="crm-input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <label>
          ราคาฐาน (บาท)
          <input
            className="crm-input"
            type="number"
            min={0}
            step={0.01}
            value={form.base_price}
            onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
          />
        </label>
        <label className="crm-form__checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          เปิดใช้งาน (แสดงในใบเสนอราคา)
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
