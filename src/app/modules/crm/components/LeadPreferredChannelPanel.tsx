import { useState } from 'react'
import type { Lead } from '../types'
import {
  NPCREATE_FACEBOOK_MESSENGER_URL,
  openUrlForPreferredChannel,
  preferredContactChannelLabel,
  staffOpenChannelLabel,
  type PreferredContactChannel,
} from '../../../../shared/crm/preferredContactChannel'
import {
  lineLoginAndOaIdsMismatch,
  resolveLineStaffChatOpenUserId,
} from '../../../../shared/line/lineUserIdResolution'
import { openStaffLineChat } from '../../../../shared/line/staffLineMessaging'
import { LeadLineOaChatIdField } from './LeadLineOaChatIdField'
import '../crm.css'

const EXTERNAL_SALES_CHECKLIST = [
  'ทักลูกค้า แนะนำตัว และยืนยันข้อมูลจากฟอร์ม',
  'สรุปความต้องการ — บันทึกใน Lead',
  'เสนอแพ็กเกจเบื้องต้น → สร้างใบเสนอราคาเมื่อลูกค้าพร้อม',
  'หลังชำระเงิน — ลูกค้าใช้ Client Workspace',
] as const

interface LeadPreferredChannelPanelProps {
  lead: Lead
  variant?: 'default' | 'quotation'
  readOnly?: boolean
  onLeadUpdated?: (lead: Lead) => void
}

export function LeadPreferredChannelPanel({
  lead,
  variant = 'default',
  readOnly = false,
  onLeadUpdated,
}: LeadPreferredChannelPanelProps) {
  const channel = lead.preferred_contact_channel
  if (!channel) return null

  const ch = channel as PreferredContactChannel
  const label = preferredContactChannelLabel(ch)
  const isLine = ch === 'line'
  const lineIds = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const openHref = openUrlForPreferredChannel(ch, lineIds)
  const hasOaChat = Boolean(resolveLineStaffChatOpenUserId(lineIds))
  const idsSynced =
    Boolean(lineIds.line_oa_chat_user_id?.trim()) &&
    !lineLoginAndOaIdsMismatch(lineIds)

  const [openLineError, setOpenLineError] = useState<string | null>(null)

  async function handleOpenLine() {
    setOpenLineError(null)
    const oaOpenId = resolveLineStaffChatOpenUserId(lineIds)
    const userId = oaOpenId ?? lineIds.line_user_id?.trim() ?? null
    if (!userId) {
      setOpenLineError('ยังไม่มี LINE User ID — บันทึกจากแชท OA หรือให้ลูกค้าทัก @npcreate')
      return
    }
    const opened = await openStaffLineChat(userId, { mode: oaOpenId ? 'direct' : 'auto' })
    if (!opened) {
      setOpenLineError(
        'เบราว์เซอร์บล็อกหน้าต่างใหม่ — อนุญาตป็อปอัปสำหรับเว็บนี้ หรือเปิด chat.line.biz แล้วค้นหาจาก ID ที่คัดลอก',
      )
    }
  }

  return (
    <section
      className={`card card--wide crm-preferred-channel crm-preferred-channel--${ch}${variant === 'quotation' ? ' crm-preferred-channel--quotation' : ''}`}
      aria-label="ช่องทางติดต่อลูกค้า"
    >
      <header className="crm-preferred-channel__head">
        <div className="crm-preferred-channel__title-block">
          {isLine ? (
            <span className="crm-preferred-channel__line-mark" aria-hidden>
              LINE
            </span>
          ) : null}
          <div>
            <h2>
              {variant === 'quotation'
                ? `ติดต่อทาง ${label} ก่อนส่งใบเสนอราคา`
                : `ช่องทางติดต่อ: ${label}`}
            </h2>
            <p className="crm-preferred-channel__lead">
              {variant === 'quotation'
                ? 'คุยและสรุปความต้องการก่อน — ส่งใบเสนอราคาเมื่อลูกค้าพร้อม'
                : 'ลูกค้าเลือกจากฟอร์มติดต่อ — คุยจนกว่าชำระและเริ่มงาน'}
            </p>
          </div>
        </div>
        {!isLine ? (
          <span className={`crm-preferred-channel__badge crm-preferred-channel__badge--${ch}`}>
            {label}
          </span>
        ) : null}
      </header>

      <div className="crm-preferred-channel__toolbar">
        {isLine ? (
          <>
            <button
              type="button"
              className="crm-btn crm-btn--primary crm-preferred-channel__cta"
              onClick={() => void handleOpenLine()}
            >
              {staffOpenChannelLabel(ch)}
            </button>
            {hasOaChat ? (
              <span className="crm-preferred-channel__pill crm-preferred-channel__pill--ok">
                เชื่อมต่อ OA แล้ว
              </span>
            ) : (
              <span className="crm-preferred-channel__pill crm-preferred-channel__pill--muted">
                บันทึก ID แชทเพื่อเปิดแชทตรง
              </span>
            )}
            {idsSynced ? (
              <span className="crm-preferred-channel__pill crm-preferred-channel__pill--ok">
                ID พร้อมใช้งาน
              </span>
            ) : null}
            {openLineError ? (
              <p className="crm-preferred-channel__open-error" role="alert">
                {openLineError}
              </p>
            ) : null}
          </>
        ) : (
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn crm-btn--primary crm-preferred-channel__cta"
          >
            {staffOpenChannelLabel(ch)}
          </a>
        )}

        {ch === 'line' && lead.line_id ? (
          <span className="crm-preferred-channel__meta">
            LINE ID: <strong>{lead.line_id}</strong>
          </span>
        ) : null}
        {ch === 'facebook' && lead.facebook_psid ? (
          <span className="crm-preferred-channel__meta">
            Facebook: <strong>{lead.facebook_psid}</strong>
          </span>
        ) : null}
        {ch === 'facebook' && lead.facebook ? (
          <span className="crm-preferred-channel__meta">
            เพจ: <strong>{lead.facebook}</strong>
          </span>
        ) : null}
        {ch === 'facebook' && !lead.facebook ? (
          <span className="crm-preferred-channel__meta muted">
            แนะนำทักเพจ{' '}
            <a href={NPCREATE_FACEBOOK_MESSENGER_URL} target="_blank" rel="noopener noreferrer">
              NP Create
            </a>
          </span>
        ) : null}
      </div>

      {isLine ? (
        <LeadLineOaChatIdField lead={lead} readOnly={readOnly} onSaved={onLeadUpdated} />
      ) : null}

      {variant === 'default' ? (
        <details className="crm-preferred-channel__steps">
          <summary>ขั้นตอนติดต่อลูกค้า</summary>
          <ol className="crm-preferred-channel__checklist">
            {EXTERNAL_SALES_CHECKLIST.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  )
}
