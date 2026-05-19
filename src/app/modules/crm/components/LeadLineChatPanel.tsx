import { useState, type FormEvent } from 'react'
import { openStaffLineChatFromUserId } from '../../../../shared/line/staffLineMessaging'
import {
  lineLoginAndOaIdsMismatch,
  resolveLineMessagingRecipientId,
  resolveLineStaffChatOpenUserId,
} from '../../../../shared/line/lineUserIdResolution'
import { getLineReplyWindowStatus } from '../../../../shared/line/lineMessageDisplay'
import { useLeadLineChat } from '../hooks/useLeadLineChat'
import { LeadLineMessageBody } from './LeadLineMessageBody'
import type { Lead } from '../types'
import '../crm.css'

interface LeadLineChatPanelProps {
  lead: Lead
  senderProfileId: string | undefined
  readOnly?: boolean
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatWindowExpiry(date: Date): string {
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LeadLineChatPanel({
  lead,
  senderProfileId,
  readOnly = false,
}: LeadLineChatPanelProps) {
  const [draft, setDraft] = useState('')
  const lineIds = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const canPush = Boolean(resolveLineMessagingRecipientId(lineIds))
  const openChatId = resolveLineStaffChatOpenUserId(lineIds)
  const idMismatch = lineLoginAndOaIdsMismatch(lineIds)
  const onlyLoginId = Boolean(lineIds.line_user_id?.trim()) && !lineIds.line_oa_chat_user_id?.trim()

  const [openManagerError, setOpenManagerError] = useState<string | null>(null)

  const { messages, loading, sending, error, bottomRef, send } = useLeadLineChat(
    lead,
    senderProfileId,
  )
  const replyWindow = getLineReplyWindowStatus(messages)

  const hasInbound = messages.some((m) => m.direction === 'inbound')
  const hasOutbound = messages.some((m) => m.direction === 'outbound')
  const lineChatLinked = hasInbound && (hasOutbound || Boolean(lineIds.line_oa_chat_user_id?.trim()))

  const showSetupBanner = !canPush
  const showIdSetupHint =
    canPush && !lineChatLinked && (onlyLoginId || idMismatch) && !hasOutbound
  const showOutsideWindow =
    canPush && lineChatLinked && !replyWindow.withinWindow && replyWindow.expiresAt

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || readOnly) return
    await send(text)
    setDraft('')
  }

  return (
    <section className="card card--wide crm-line-chat" aria-label="แชท LINE">
      <header className="crm-line-chat__head">
        <div className="crm-line-chat__title-row">
          <span className="crm-line-chat__line-badge" aria-hidden>
            LINE
          </span>
          <div>
            <h2>แชทกับลูกค้า</h2>
            <p className="crm-line-chat__subtitle">
              {lineChatLinked
                ? 'ส่งและรับข้อความผ่าน Official Account'
                : 'เชื่อมต่อเมื่อลูกค้าทัก OA หรือบันทึก ID จาก chat.line.biz'}
            </p>
          </div>
        </div>
        {openChatId ? (
          <button
            type="button"
            className="crm-btn crm-btn--ghost crm-line-chat__open-external"
            onClick={() => {
              setOpenManagerError(null)
              const result = openStaffLineChatFromUserId(openChatId, {
                mode: 'direct',
                surface: 'manager',
              })
              if (!result.ok) {
                setOpenManagerError(result.message)
                return
              }
              if (!result.opened) {
                setOpenManagerError('เบราว์เซอร์บล็อกป็อปอัป — อนุญาตป็อปอัปแล้วลองใหม่')
              }
            }}
          >
            เปิดใน Manager
          </button>
        ) : null}
      </header>

      {openManagerError ? (
        <p className="crm-line-chat__open-error" role="alert">
          {openManagerError}
        </p>
      ) : null}

      <div className="crm-line-chat__status-row" role="status">
        {lineChatLinked ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--ok">เชื่อมต่อแล้ว</span>
        ) : canPush ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--muted">รอข้อความจากลูกค้า</span>
        ) : null}
        {canPush && replyWindow.withinWindow && replyWindow.expiresAt ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--window">
            Push ได้ถึง {formatWindowExpiry(replyWindow.expiresAt)}
          </span>
        ) : null}
        {showOutsideWindow && replyWindow.expiresAt ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--warn">
            นอกช่วง 24 ชม. — ให้ลูกค้าทักใหม่
          </span>
        ) : null}
      </div>

      {showSetupBanner ? (
        <div className="crm-line-chat__notice crm-line-chat__notice--warn">
          <p>ยังส่งจากระบบไม่ได้ — บันทึก LINE User ID จาก URL แชท OA ในส่วนด้านบน</p>
        </div>
      ) : null}

      {showIdSetupHint ? (
        <div className="crm-line-chat__notice crm-line-chat__notice--info">
          <p>
            {idMismatch
              ? 'มี ID จากฟอร์มติดต่อกับแชท OA คนละตัว — ให้ลูกค้าทัก OA หนึ่งครั้ง หรือบันทึก ID จาก chat.line.biz'
              : 'มีเฉพาะ ID จากฟอร์ม — ถ้าส่งไม่ผ่าน ให้บันทึก ID จาก chat.line.biz'}
          </p>
        </div>
      ) : null}

      <div className="crm-line-chat__thread" aria-live="polite">
        {loading ? (
          <p className="crm-line-chat__empty">กำลังโหลดข้อความ…</p>
        ) : messages.length === 0 ? (
          <p className="crm-line-chat__empty">
            ยังไม่มีข้อความ — ข้อความจากลูกค้าจะแสดงที่นี่หลังทัก OA
          </p>
        ) : (
          <ul className="crm-line-chat__messages">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`crm-line-chat__msg crm-line-chat__msg--${m.direction}`}
              >
                <span className="crm-line-chat__sender">
                  {m.direction === 'outbound' ? 'ทีม' : 'ลูกค้า'}
                </span>
                <LeadLineMessageBody message={m} />
                <time className="crm-line-chat__time" dateTime={m.created_at}>
                  {formatTime(m.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="crm-line-chat__error">{error}</p> : null}

      {!readOnly && canPush ? (
        <form className="crm-line-chat__composer" onSubmit={(e) => void handleSubmit(e)}>
          <label className="crm-line-chat__label" htmlFor={`lead-line-draft-${lead.id}`}>
            ข้อความ LINE
          </label>
          <div className="crm-line-chat__composer-row">
            <textarea
              id={`lead-line-draft-${lead.id}`}
              className="crm-line-chat__input"
              rows={2}
              placeholder="พิมพ์ข้อความ…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              className="crm-line-chat__send"
              disabled={sending || !draft.trim()}
              aria-label="ส่งข้อความ"
            >
              {sending ? '…' : 'ส่ง'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
