import { useState, type FormEvent } from 'react'
import { openStaffLineChat } from '../../../../shared/line/staffLineMessaging'
import {
  lineStaffChatIdHint,
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

  const { messages, loading, sending, error, bottomRef, send } = useLeadLineChat(
    lead,
    senderProfileId,
  )
  const replyWindow = getLineReplyWindowStatus(messages)

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
        <div>
          <h2>แชท LINE ในระบบ</h2>
          <p className="muted crm-line-chat__hint">{lineStaffChatIdHint(lineIds)}</p>
        </div>
        {openChatId ? (
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            onClick={() => void openStaffLineChat(openChatId, { mode: 'direct' })}
          >
            เปิด chat.line.biz
          </button>
        ) : null}
      </header>

      {!canPush ? (
        <p className="crm-banner crm-banner--warn">
          ยังส่งข้อความจากระบบไม่ได้ — บันทึก LINE User ID จาก URL แชท OA ในส่วนด้านบนก่อน
        </p>
      ) : null}

      {canPush && !replyWindow.withinWindow && replyWindow.expiresAt ? (
        <p className="crm-banner crm-banner--warn">
          นอกช่วง 24 ชม. หลังลูกค้าทักล่าสุด (
          {replyWindow.expiresAt.toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
          ) — Push อาจถูกจำกัดตามนโยบาย LINE แนะนำให้ลูกค้าทักใหม่หรือใช้ chat.line.biz
        </p>
      ) : null}

      {canPush && replyWindow.withinWindow && replyWindow.expiresAt ? (
        <p className="crm-line-chat__window-ok muted">
          ส่ง Push ได้จนถึง{' '}
          {replyWindow.expiresAt.toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          (24 ชม. หลังลูกค้าทักล่าสุด)
        </p>
      ) : null}

      <div className="crm-line-chat__thread" aria-live="polite">
        {loading ? (
          <p className="muted crm-line-chat__empty">กำลังโหลดข้อความ…</p>
        ) : messages.length === 0 ? (
          <p className="muted crm-line-chat__empty">
            ยังไม่มีข้อความในระบบ — ข้อความจากลูกค้าจะปรากฏหลังตั้ง Webhook LINE และลูกค้าทัก OA
          </p>
        ) : (
          <ul className="crm-line-chat__messages">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`crm-line-chat__msg crm-line-chat__msg--${m.direction}`}
              >
                <LeadLineMessageBody message={m} />
                <time className="crm-line-chat__time" dateTime={m.created_at}>
                  {formatTime(m.created_at)}
                  {m.direction === 'outbound' ? ' · ทีม' : ' · ลูกค้า'}
                </time>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="crm-error">{error}</p> : null}

      {!readOnly && canPush ? (
        <form className="crm-line-chat__composer" onSubmit={(e) => void handleSubmit(e)}>
          <label className="crm-line-chat__label" htmlFor={`lead-line-draft-${lead.id}`}>
            ข้อความ LINE
          </label>
          <textarea
            id={`lead-line-draft-${lead.id}`}
            className="crm-line-chat__input"
            rows={2}
            placeholder="พิมพ์ข้อความส่งลูกค้าทาง LINE…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="crm-btn crm-btn--primary"
            disabled={sending || !draft.trim()}
          >
            {sending ? 'กำลังส่ง…' : 'ส่ง'}
          </button>
        </form>
      ) : null}

      <p className="crm-line-chat__footnote muted">
        ข้อความเข้าจาก LINE Webhook · ข้อความออกผ่าน Messaging API (ต้องเป็นเพื่อน OA)
      </p>
    </section>
  )
}
