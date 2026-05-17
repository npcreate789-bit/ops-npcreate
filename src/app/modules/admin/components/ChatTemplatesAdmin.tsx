import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  deleteChatMessageTemplate,
  listChatMessageTemplatesAdmin,
  upsertChatMessageTemplate,
} from '../../chat/api/chatSocial'
import type { ChatMessageTemplate } from '../../chat/types'

interface ChatTemplatesAdminProps {
  disabled?: boolean
}

const EMPTY_FORM = {
  label: '',
  body: '',
  sort_order: 50,
  is_active: true,
}

export function ChatTemplatesAdmin({ disabled = false }: ChatTemplatesAdminProps) {
  const [rows, setRows] = useState<ChatMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listChatMessageTemplatesAdmin())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดเทมเพลตไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function startEdit(row: ChatMessageTemplate) {
    setEditingId(row.id)
    setForm({
      label: row.label,
      body: row.body,
      sort_order: row.sort_order,
      is_active: row.is_active,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!form.label.trim() || !form.body.trim()) {
      setError('กรอกชื่อและข้อความเทมเพลต')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await upsertChatMessageTemplate({
        id: editingId ?? undefined,
        label: form.label.trim(),
        body: form.body.trim(),
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('ลบเทมเพลตนี้?')) return
    setSaving(true)
    try {
      await deleteChatMessageTemplate(id)
      if (editingId === id) resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card card--wide admin-platform-card">
      <h2 className="crm-section-title">เทมเพลตข้อความแชท</h2>
      <p className="muted admin-platform-intro">
        ทีมเลือกใช้ในช่องแชท (chip ด้านล่าง) — ลูกค้าไม่เห็นรายการนี้
      </p>

      {error && <p className="crm-error">{error}</p>}

      <form className="admin-chat-templates-form" onSubmit={(e) => void handleSave(e)}>
        <div className="admin-chat-templates-form__grid">
          <label className="task-field">
            <span className="task-field__label">ชื่อปุ่ม</span>
            <input
              className="crm-input"
              value={form.label}
              disabled={disabled || saving}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </label>
          <label className="task-field">
            <span className="task-field__label">ลำดับ</span>
            <input
              type="number"
              className="crm-input"
              value={form.sort_order}
              disabled={disabled || saving}
              onChange={(e) =>
                setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
              }
            />
          </label>
        </div>
        <label className="task-field">
          <span className="task-field__label">ข้อความ</span>
          <textarea
            className="crm-input"
            rows={3}
            value={form.body}
            disabled={disabled || saving}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          />
        </label>
        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={form.is_active}
            disabled={disabled || saving}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          เปิดใช้งาน
        </label>
        <div className="admin-platform-actions">
          <button type="submit" className="crm-btn crm-btn--primary" disabled={disabled || saving}>
            {saving ? 'กำลังบันทึก…' : editingId ? 'อัปเดตเทมเพลต' : 'เพิ่มเทมเพลต'}
          </button>
          {editingId && (
            <button type="button" className="crm-btn crm-btn--ghost" onClick={resetForm}>
              ยกเลิกแก้ไข
            </button>
          )}
        </div>
      </form>

      {loading && <p className="muted">กำลังโหลดเทมเพลต…</p>}

      {!loading && rows.length > 0 && (
        <ul className="admin-chat-templates-list">
          {rows.map((row) => (
            <li key={row.id} className={!row.is_active ? 'is-inactive' : undefined}>
              <div>
                <strong>{row.label}</strong>
                {!row.is_active && <span className="muted"> (ปิด)</span>}
                <p className="muted admin-chat-templates-list__body">{row.body}</p>
              </div>
              <div className="admin-platform-actions">
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost crm-btn--sm"
                  disabled={disabled || saving}
                  onClick={() => startEdit(row)}
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost crm-btn--sm"
                  disabled={disabled || saving}
                  onClick={() => void handleDelete(row.id)}
                >
                  ลบ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
