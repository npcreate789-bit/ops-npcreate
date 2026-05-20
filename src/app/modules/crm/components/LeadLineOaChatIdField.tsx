import { useEffect, useState } from 'react'
import {
  clearRememberedLineChatBizAccountIfMatchesUser,
  getStaffLineChatBizAccountId,
  LINE_CHAT_BIZ_ACCOUNT_ID,
  rememberLineChatBizAccountFromInput,
} from '../../../../shared/line/staffLineMessaging'
import { buildLineChatBizDirectUrl } from '../../../../shared/line/lineChatBizUrl'
import {
  computeLineOaChatSyncState,
  lineOaChatIdPostSaveNotice,
} from '../../../../shared/line/lineOaChatSyncState'
import {
  lineOaChatUserIdSaveError,
  lineOaChatUserIdSaveWarning,
  parseLineOaChatUserIdFromInput,
} from '../../../../shared/line/lineUserIdResolution'
import { updateLead } from '../api/leads'
import type { Lead } from '../types'
import '../crm.css'

interface LeadLineOaChatIdFieldProps {
  lead: Lead
  /** จากข้อความเข้า — ให้ข้อความเตือนตรงกับ ID ที่ใช้ส่งจริง */
  latestInboundLineUserId?: string | null
  readOnly?: boolean
  onSaved?: (lead: Lead) => void
}

function formatOaChatDraftValue(oaUserId: string | null | undefined): string {
  const oa = oaUserId?.trim() ?? ''
  if (!oa) return ''
  const accountId = getStaffLineChatBizAccountId()
  if (accountId) {
    const url = buildLineChatBizDirectUrl(oa, accountId)
    if (url) return url
  }
  return oa
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
  latestInboundLineUserId,
  readOnly = false,
  onSaved,
}: LeadLineOaChatIdFieldProps) {
  const [draft, setDraft] = useState(() => formatOaChatDraftValue(lead.line_oa_chat_user_id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)

  useEffect(() => {
    const oaFromLead = lead.line_oa_chat_user_id?.trim() ?? ''
    const parsedFromDraft = parseLineOaChatUserIdFromInput(draft)
    setDraft(formatOaChatDraftValue(lead.line_oa_chat_user_id))
    if (
      oaFromLead &&
      parsedFromDraft &&
      oaFromLead.toLowerCase() !== parsedFromDraft.toLowerCase()
    ) {
      setSaveWarning(null)
      setError(null)
    }
  }, [lead.id, lead.line_oa_chat_user_id])

  const lineIds = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const sync = computeLineOaChatSyncState(lineIds, latestInboundLineUserId)
  const { loginId, savedOaId: oaId, sameId, showTopMismatchNote, showOaReadyMessage, shouldOfferInboundSync } =
    sync
  const hasOaId = Boolean(oaId)
  const needsSetup = !hasOaId && !readOnly

  async function handleSave() {
    setError(null)
    setSaveWarning(null)
    const parsed = parseLineOaChatUserIdFromInput(draft)
    if (!parsed) {
      setError('วางลิงก์ chat.line.biz / manager.line.biz หรือ ID หลัง /chat/ (U + 32 ตัว)')
      return
    }
    const saveErr = lineOaChatUserIdSaveError(parsed, LINE_CHAT_BIZ_ACCOUNT_ID)
    if (saveErr) {
      setError(saveErr)
      return
    }
    const accountWarning = lineOaChatUserIdSaveWarning(
      draft,
      LINE_CHAT_BIZ_ACCOUNT_ID,
      parsed,
    )
    if (draft.includes('line.biz')) {
      rememberLineChatBizAccountFromInput(draft)
    } else {
      clearRememberedLineChatBizAccountIfMatchesUser(parsed)
    }
    setSaving(true)
    try {
      const updated = await updateLead(lead.id, { line_oa_chat_user_id: parsed })
      setDraft(formatOaChatDraftValue(parsed))
      setSavedFlash(true)
      const afterSave = computeLineOaChatSyncState(
        { ...lineIds, line_oa_chat_user_id: parsed },
        latestInboundLineUserId,
      )
      const postNotice = lineOaChatIdPostSaveNotice(afterSave, parsed)
      if (postNotice) setSaveWarning(postNotice)
      else if (accountWarning) setSaveWarning(accountWarning)
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
      const trimmed = text.trim()
      const parsed = parseLineOaChatUserIdFromInput(trimmed)
      if (parsed) {
        setDraft(trimmed.includes('line.biz') ? trimmed : formatOaChatDraftValue(parsed))
        if (trimmed.includes('line.biz')) {
          rememberLineChatBizAccountFromInput(trimmed)
        }
      } else setDraft(trimmed)
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

      {showTopMismatchNote ? (
        <p className="crm-line-ids__note" role="status">
          ID จากฟอร์มกับแชท OA ไม่ตรงกัน — ระบบจะใช้ ID จากแชท OA / ข้อความลูกค้าสำหรับส่ง Push
        </p>
      ) : null}

      {showOaReadyMessage ? (
        <p className="crm-line-ids__ready" role="status">
          {shouldOfferInboundSync
            ? 'ส่งข้อความใช้ ID จากข้อความลูกค้า — อัปเดตค่าที่บันทึกได้ในแผงแชทด้านล่าง'
            : 'เชื่อมต่อแชท OA แล้ว — ใช้แผงแชทด้านล่างส่งข้อความได้'}
        </p>
      ) : null}

      {!readOnly ? (
        <details className="crm-line-ids__edit" open={needsSetup}>
          <summary>{hasOaId ? 'แก้ไข ID แชท OA' : 'บันทึก ID จากแชท OA'}</summary>
          <p className="crm-line-ids__edit-hint muted">
            วางลิงก์เต็ม เช่น{' '}
            <code>{'https://chat.line.biz/{account}/chat/{user}'}</code>
            {getStaffLineChatBizAccountId() ? (
              <>
                {' '}
                (account ที่ใช้เปิดแชท:{' '}
                <code>{getStaffLineChatBizAccountId().slice(0, 10)}…</code>)
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
          {savedFlash && !saveWarning ? <p className="crm-line-ids__ok">บันทึกแล้ว</p> : null}
          {saveWarning ? (
            <p className="crm-line-ids__note" role="status">
              {saveWarning}
            </p>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}
