import { useEffect, useState, type FormEvent } from 'react'
import type { Creator, CreatorInput, CreatorStatus } from '../types'
import { CREATOR_STATUS_OPTIONS } from '../constants'
import '../../crm/crm.css'

interface Props {
  initial?: Creator | null
  ownerId: string
  saving?: boolean
  readOnly?: boolean
  onSubmit: (input: CreatorInput) => void | Promise<void>
  onCancel: () => void
}

function toState(initial?: Creator | null) {
  return {
    display_name: initial?.display_name ?? '',
    tiktok_handle: initial?.tiktok_handle ?? '',
    line_id: initial?.line_id ?? '',
    phone: initial?.phone ?? '',
    niche: initial?.niche ?? '',
    rate_per_clip: initial?.rate_per_clip?.toString() ?? '',
    status: (initial?.status ?? 'active') as CreatorStatus,
    notes: initial?.notes ?? '',
  }
}

export function CreatorForm({
  initial,
  ownerId,
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
    if (readOnly || !form.display_name.trim()) return
    onSubmit({
      display_name: form.display_name.trim(),
      tiktok_handle: form.tiktok_handle.trim() || null,
      line_id: form.line_id.trim() || null,
      phone: form.phone.trim() || null,
      niche: form.niche.trim() || null,
      rate_per_clip: form.rate_per_clip ? Number(form.rate_per_clip) : null,
      status: form.status,
      notes: form.notes.trim() || null,
      created_by: initial?.created_by ?? ownerId,
    })
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly} className="crm-form__grid">
        <label>
          ชื่อครีเอเตอร์ *
          <input
            className="crm-input"
            required
            value={form.display_name}
            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          />
        </label>
        <label>
          TikTok
          <input
            className="crm-input"
            value={form.tiktok_handle}
            onChange={(e) => setForm((f) => ({ ...f, tiktok_handle: e.target.value }))}
          />
        </label>
        <label>
          Line ID
          <input
            className="crm-input"
            value={form.line_id}
            onChange={(e) => setForm((f) => ({ ...f, line_id: e.target.value }))}
          />
        </label>
        <label>
          เบอร์โทร
          <input
            className="crm-input"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <label>
          หมวด / Niche
          <input
            className="crm-input"
            value={form.niche}
            onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
          />
        </label>
        <label>
          เรทต่อคลิป (บาท)
          <input
            type="number"
            min={0}
            className="crm-input"
            value={form.rate_per_clip}
            onChange={(e) => setForm((f) => ({ ...f, rate_per_clip: e.target.value }))}
          />
        </label>
        <label>
          สถานะ
          <select
            className="crm-select"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as CreatorStatus }))
            }
          >
            {CREATOR_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="crm-form__full">
          บันทึก
          <textarea
            className="crm-input"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
