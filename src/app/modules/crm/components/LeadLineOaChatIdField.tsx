import { useEffect, useState } from 'react'
import {
  lineLoginAndOaIdsMismatch,
  lineStaffChatIdHint,
  parseLineOaChatUserIdFromInput,
  resolveLineStaffChatOpenUserId,
} from '../../../../shared/line/lineUserIdResolution'
import { openStaffLineChat } from '../../../../shared/line/staffLineMessaging'
import { updateLead } from '../api/leads'
import type { Lead } from '../types'
import '../crm.css'

interface LeadLineOaChatIdFieldProps {
  lead: Lead
  readOnly?: boolean
  onSaved?: (lead: Lead) => void
}

export function LeadLineOaChatIdField({
  lead,
  readOnly = false,
  onSaved,
}: LeadLineOaChatIdFieldProps) {
  const [draft, setDraft] = useState(lead.line_oa_chat_user_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    setDraft(lead.line_oa_chat_user_id ?? '')
  }, [lead.id, lead.line_oa_chat_user_id])

  const ids = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const mismatch = lineLoginAndOaIdsMismatch(ids)
  const openId = resolveLineStaffChatOpenUserId(ids)

  async function handleSave() {
    setError(null)
    const parsed = parseLineOaChatUserIdFromInput(draft)
    if (!parsed) {
      setError(
        'ไม่พบ LINE User ID (รูปแบบ U ตามด้วยตัวเลข a-f 32 ตัว) — วางลิงก์ chat.line.biz หรือ ID จาก URL แชท',
      )
      return
    }
    setSaving(true)
    try {
      const updated = await updateLead(lead.id, { line_oa_chat_user_id: parsed })
      setDraft(parsed)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 2500)
      onSaved?.(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  function handlePasteFromClipboard() {
    void navigator.clipboard.readText().then((text) => {
      const parsed = parseLineOaChatUserIdFromInput(text)
      if (parsed) setDraft(parsed)
      else setDraft(text.trim())
    })
  }

  return (
    <div className="crm-line-ids">
      <div className="crm-line-ids__row">
        {lead.line_user_id && (
          <p className="crm-line-ids__id muted">
            LINE Login (ฟอร์มติดต่อ): <strong>{lead.line_user_id}</strong>
          </p>
        )}
        {lead.line_oa_chat_user_id && (
          <p className="crm-line-ids__id">
            แชท OA: <strong>{lead.line_oa_chat_user_id}</strong>
          </p>
        )}
        {mismatch && (
          <p className="crm-line-ids__warn" role="status">
            ID จากการเชื่อมต่อ LINE กับแชท OA ไม่ตรงกัน — ปกติเมื่อยังไม่ได้ผูกช่อง Login กับ OA
            หรือลูกค้ายังไม่ทัก @npcreate
          </p>
        )}
        <p className="crm-line-ids__hint muted">{lineStaffChatIdHint(ids)}</p>
      </div>

      {!readOnly && (
        <div className="crm-line-ids__form">
          <label className="crm-line-ids__label" htmlFor={`line-oa-chat-${lead.id}`}>
            บันทึก ID จากแชท OA
          </label>
          <div className="crm-line-ids__controls">
            <input
              id={`line-oa-chat-${lead.id}`}
              type="text"
              className="crm-input"
              placeholder="วางลิงก์ chat.line.biz/.../chat/U… หรือ ID หลัง /chat/"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
            />
            <button
              type="button"
              className="crm-btn crm-btn--secondary"
              disabled={saving}
              onClick={handlePasteFromClipboard}
            >
              วางจากคลิปบอร์ด
            </button>
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              disabled={saving || !draft.trim()}
              onClick={() => void handleSave()}
            >
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </div>
          {error && (
            <p className="contact-field-error" role="alert">
              {error}
            </p>
          )}
          {savedFlash && <p className="crm-line-ids__ok">บันทึก ID แชท OA แล้ว</p>}
        </div>
      )}

      {openId && (
        <button
          type="button"
          className="crm-btn crm-btn--secondary crm-line-ids__open"
          onClick={() => void openStaffLineChat(openId, { mode: 'direct' })}
        >
          เปิดแชทตรง (chat.line.biz)
        </button>
      )}
    </div>
  )
}
