import { useEffect, useState, type FormEvent } from 'react'
import {
  datetimeLocalBangkokToIso,
  isoToDatetimeLocalBangkok,
} from '../../../../shared/dates/bangkok'
import type { CustomerOption } from '../../finance/types'
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from '../constants'
import type { AssigneeOption, Task, TaskInput } from '../types'
import '../../crm/crm.css'
import '../tasks.css'

export interface TaskFormState {
  title: string
  description: string
  status: Task['status']
  priority: Task['priority']
  assignee_id: string
  customer_id: string
  due_at: string
}

function toState(
  initial: Task | null | undefined,
  assigneeId: string,
): TaskFormState {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'todo',
    priority: initial?.priority ?? 'medium',
    assignee_id: initial?.assignee_id ?? assigneeId,
    customer_id: initial?.customer_id ?? '',
    due_at: isoToDatetimeLocalBangkok(initial?.due_at),
  }
}

interface TaskFormProps {
  initial?: Task | null
  assignees: AssigneeOption[]
  customers: CustomerOption[]
  ownerId: string
  saving?: boolean
  readOnly?: boolean
  onSubmit: (input: TaskInput) => void | Promise<void>
  onCancel: () => void
}

export function TaskForm({
  initial,
  assignees,
  customers,
  ownerId,
  saving,
  readOnly = false,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [form, setForm] = useState(() => toState(initial, ownerId))

  useEffect(() => {
    setForm(toState(initial, ownerId))
  }, [initial, ownerId])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (readOnly) return
    if (!form.title.trim() || !form.assignee_id) return
    const dueAt = datetimeLocalBangkokToIso(form.due_at)
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || ownerId,
      created_by: initial?.created_by ?? ownerId,
      customer_id: form.customer_id || null,
      lead_id: initial?.lead_id ?? null,
      due_at: dueAt,
    })
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      <fieldset disabled={readOnly}>
      {assignees.length === 0 && (
        <p className="crm-banner crm-banner--warn">
          โหลดรายชื่อพนักงานไม่ได้ — ตรวจสอบสิทธิ์หรือการเชื่อมต่อ
        </p>
      )}
      <label className="task-field task-field--full">
        <span className="task-field__label">หัวข้องาน *</span>
        <input
          className="crm-input"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
      </label>

      <label className="task-field task-field--full">
        <span className="task-field__label">รายละเอียด</span>
        <textarea
          className="crm-input"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </label>

      <div className="task-form-grid">
        <label className="task-field">
          <span className="task-field__label">สถานะ</span>
          <select
            className="task-select"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as Task['status'] }))
            }
          >
            {TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">ความสำคัญ</span>
          <select
            className="task-select"
            value={form.priority}
            onChange={(e) =>
              setForm((f) => ({ ...f, priority: e.target.value as Task['priority'] }))
            }
          >
            {TASK_PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">ผู้รับผิดชอบ</span>
          <select
            className="task-select"
            required
            value={form.assignee_id}
            disabled={assignees.length === 0}
            onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
          >
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span className="task-field__label">ลูกค้า (ถ้ามี)</span>
          <select
            className="task-select"
            value={form.customer_id}
            onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
          >
            <option value="">— ไม่ระบุ —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.brand_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="task-field task-field--full">
        <span className="task-field__label">กำหนดเสร็จ</span>
        <input
          type="datetime-local"
          className="crm-input"
          value={form.due_at}
          onChange={(e) => setForm((f) => ({ ...f, due_at: e.target.value }))}
        />
      </label>
      </fieldset>

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
