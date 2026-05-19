import { useEffect, useState } from 'react'
import { LINE_CHAT_BIZ_ACCOUNT_ID } from '../../../../shared/line/staffLineMessaging'
import {
  lineLoginAndOaIdsMismatch,
  lineOaChatUserIdSaveError,
  parseLineOaChatUserIdFromInput,
} from '../../../../shared/line/lineUserIdResolution'
import { updateLead } from '../api/leads'
import type { Lead } from '../types'
import '../crm.css'

interface LeadLineOaChatIdFieldProps {
  lead: Lead
  readOnly?: boolean
  onSaved?: (lead: Lead) => void
}

function truncateId(id: string): string {
  const t = id.trim()
  if (t.length <= 20) return t
  return `${t.slice(0, 10)}…${t.slice(-10)}`
}

function CopyIdButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value.trim())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      className="crm-line-ids__copy"
      onClick={() => void handleCopy()}
      title="คัดลอก ID เต็ม"
    >
      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
    </button>
  )
}

function IdCard({
  label,
  value,
  primary,
  meta,
}: {
  label: string
  value: string
  primary?: boolean
  meta?: string
}) {
  return (
    <div className={`crm-line-ids__card${primary ? ' crm-line-ids__card--primary' : ''}`}>
      <span className="crm-line-ids__card-label">{label}</span>
      <div className="crm-line-ids__card-row">
        <code className="crm-line-ids__card-value" title={value}>
          {truncateId(value)}
        </code>
        <CopyIdButton value={value} />
      </div>
      {meta ? <span className="crm-line-ids__card-meta">{meta}</span> : null}
    </div>
  )
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

  const loginId = lead.line_user_id?.trim() ?? ''
  const oaId = lead.line_oa_chat_user_id?.trim() ?? ''
  const sameId =
    Boolean(loginId && oaId) && loginId.toLowerCase() === oaId.toLowerCase()
  const mismatch = lineLoginAndOaIdsMismatch({
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  })
  const hasOaId = Boolean(oaId)
  const needsSetup = !hasOaId && !readOnly

  async function handleSave() {
    setError(null)
    const parsed = parseLineOaChatUserIdFromInput(draft)
    if (!parsed) {
      setError('วางลิงก์ chat.line.biz / manager.line.biz หรือ ID หลัง /chat/ (U + 32 ตัว)')
      return
    }
    const saveErr = lineOaChatUserIdSaveError(parsed, draft, LINE_CHAT_BIZ_ACCOUNT_ID)
    if (saveErr) {
      setError(saveErr)
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
      {(loginId || oaId) && (
        <div className="crm-line-ids__cards">
          {sameId ? (
            <IdCard label="LINE User ID" value={loginId} primary meta="ใช้ทั้งฟอร์มติดต่อและแชท OA" />
          ) : (
            <>
              {loginId ? <IdCard label="ฟอร์มติดต่อ (LINE Login)" value={loginId} /> : null}
              {oaId ? (
                <IdCard label="แชท Official Account" value={oaId} primary meta="ใช้เปิดแชทและส่งจากระบบ" />
              ) : null}
            </>
          )}
        </div>
      )}

      {mismatch && !sameId ? (
        <p className="crm-line-ids__note" role="status">
          ID จากฟอร์มกับแชท OA ไม่ตรงกัน — ระบบจะใช้ ID จากแชท OA / ข้อความลูกค้าสำหรับส่ง Push
        </p>
      ) : null}

      {hasOaId ? (
        <p className="crm-line-ids__ready" role="status">
          เชื่อมต่อแชท OA แล้ว — ใช้แผงแชทด้านล่างส่งข้อความได้
        </p>
      ) : null}

      {!readOnly ? (
        <details className="crm-line-ids__edit" open={needsSetup}>
          <summary>{hasOaId ? 'แก้ไข ID แชท OA' : 'บันทึก ID จากแชท OA'}</summary>
          <p className="crm-line-ids__edit-hint muted">
            วางลิงก์เต็ม เช่น{' '}
            <code>
              https://chat.line.biz/U2626…/chat/U1bfd708…
            </code>
            {LINE_CHAT_BIZ_ACCOUNT_ID ? (
              <>
                {' '}
                (account ในระบบ: <code>{LINE_CHAT_BIZ_ACCOUNT_ID.slice(0, 10)}…</code>)
              </>
            ) : (
              ' — ตั้ง VITE_LINE_CHAT_BIZ_ACCOUNT_ID บน Vercel'
            )}
          </p>
          <div className="crm-line-ids__controls">
            <input
              id={`line-oa-chat-${lead.id}`}
              type="text"
              className="crm-input crm-line-ids__input"
              placeholder="วางลิงก์หรือ Uxxxxxxxx…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={saving}
            />
            <button
              type="button"
              className="crm-btn crm-btn--ghost"
              disabled={saving}
              onClick={handlePasteFromClipboard}
            >
              วาง
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
          {error ? (
            <p className="crm-line-ids__error" role="alert">
              {error}
            </p>
          ) : null}
          {savedFlash ? <p className="crm-line-ids__ok">บันทึกแล้ว</p> : null}
        </details>
      ) : null}
    </div>
  )
}
