import { useEffect, useState } from 'react'
import { isoToDatetimeLocalBangkok } from '../../../../shared/dates/bangkok'
import {
  CONTENT_FORMAT_OPTIONS,
  CONTENT_STATUS_OPTIONS,
} from '../constants'
import type { ContentFormat, ContentJob, ContentJobStatus } from '../types'
import '../../tasks/tasks.css'

export interface ContentJobFormState {
  customer_id: string
  title: string
  brief: string
  format: ContentFormat
  status: ContentJobStatus
  assignee_id: string
  deliverable_url: string
  due_at: string
}

interface Props {
  initial?: ContentJob | null
  assignees: { id: string; label: string }[]
  customers: { id: string; brand_name: string }[]
  ownerId: string
  saving: boolean
  readOnly?: boolean
  onSubmit: (form: ContentJobFormState) => void
  onCancel: () => void
}

function defaultForm(ownerId: string, initial?: ContentJob | null): ContentJobFormState {
  if (initial) {
    return {
      customer_id: initial.customer_id,
      title: initial.title,
      brief: initial.brief ?? '',
      format: initial.format,
      status: initial.status,
      assignee_id: initial.assignee_id,
      deliverable_url: initial.deliverable_url ?? '',
      due_at: isoToDatetimeLocalBangkok(initial.due_at),
    }
  }
  return {
    customer_id: '',
    title: '',
    brief: '',
    format: 'short_clip',
    status: 'briefed',
    assignee_id: ownerId,
    deliverable_url: '',
    due_at: '',
  }
}

export function ContentJobForm({
  initial,
  assignees,
  customers,
  ownerId,
  saving,
  readOnly = false,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState(() => defaultForm(ownerId, initial))

  useEffect(() => {
    setForm(defaultForm(ownerId, initial))
  }, [initial, ownerId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form className="crm-form content-form" onSubmit={handleSubmit}>
      {assignees.length === 0 && (
        <p className="crm-banner crm-banner--warn">
          โหลดรายชื่อพนักงานไม่ได้ — ตรวจสอบสิทธิ์หรือการเชื่อมต่อ
        </p>
      )}
      {customers.length === 0 && (
        <p className="crm-banner crm-banner--warn">
          ไม่พบรายชื่อลูกค้า — ต้องมีลูกค้า active/pending ในระบบ
        </p>
      )}
      <label className="task-field task-field--full">
        <span className="task-field__label">หัวข้องาน *</span>
        <input
          className="crm-input"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          disabled={readOnly}
        />
      </label>

      <label className="task-field task-field--full">
        <span className="task-field__label">บรีฟ / รายละเอียด</span>
        <textarea
          className="crm-input"
          rows={4}
          value={form.brief}
          onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
          disabled={readOnly}
        />
      </label>

      <div className="task-form-grid">
        <label className="task-field">
          <span className="task-field__label">ลูกค้า *</span>
          <select
            className="task-select"
            required
            value={form.customer_id}
            onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
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
        <label className="task-field">
          <span className="task-field__label">รูปแบบ</span>
          <select
            className="task-select"
            value={form.format}
            onChange={(e) =>
              setForm((f) => ({ ...f, format: e.target.value as ContentFormat }))
            }
            disabled={readOnly}
          >
            {CONTENT_FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">สถานะ</span>
          <select
            className="task-select"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as ContentJobStatus }))
            }
            disabled={readOnly}
          >
            {CONTENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">ผู้รับผิดชอบ *</span>
          <select
            className="task-select"
            required
            value={form.assignee_id}
            disabled={readOnly || assignees.length === 0}
            onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
          >
            {assignees.length === 0 && <option value="">— ไม่มีรายชื่อ —</option>}
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="task-field task-field--full">
        <span className="task-field__label">ลิงก์ไฟล์ส่งมอบ</span>
        <input
          className="crm-input"
          type="text"
          inputMode="url"
          placeholder="https://... (ไม่บังคับ)"
          value={form.deliverable_url}
          onChange={(e) => setForm((f) => ({ ...f, deliverable_url: e.target.value }))}
          disabled={readOnly}
        />
      </label>

      <label className="task-field task-field--full">
        <span className="task-field__label">กำหนดส่ง</span>
        <input
          type="datetime-local"
          className="crm-input"
          value={form.due_at}
          onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))}
          disabled={readOnly}
        />
      </label>

      <div className="crm-form-actions">
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
