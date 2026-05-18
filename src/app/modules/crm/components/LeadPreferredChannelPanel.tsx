import type { Lead } from '../types'
import {
  NPCREATE_FACEBOOK_MESSENGER_URL,
  openUrlForPreferredChannel,
  preferredContactChannelLabel,
  staffOpenChannelLabel,
  type PreferredContactChannel,
} from '../../../../shared/crm/preferredContactChannel'
import { openStaffLineChat } from '../../../../shared/line/staffLineMessaging'
import { LeadLineOaChatIdField } from './LeadLineOaChatIdField'
import '../crm.css'

const EXTERNAL_SALES_CHECKLIST = [
  'ทักลูกค้าทางช่องทางที่เลือก — แนะนำตัวและยืนยันข้อมูลจากฟอร์ม',
  'สรุปความต้องการ / บริการที่สนใจ — บันทึกใน Lead (Pain points / บันทึก)',
  'เสนอแพ็กเกจเบื้องต้น — เมื่อลูกค้าพร้อมค่อยสร้างใบเสนอราคาในระบบ',
  'หลังอนุมัติใบเสนอราคาและชำระเงิน — ลูกค้าใช้แชทใน Client Workspace',
] as const

interface LeadPreferredChannelPanelProps {
  lead: Lead
  /** แสดงคำเตือนก่อนส่งใบเสนอราคา */
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
  const lineIds = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const openHref = openUrlForPreferredChannel(ch, lineIds)

  return (
    <section
      className={`card card--wide crm-preferred-channel${variant === 'quotation' ? ' crm-preferred-channel--quotation' : ''}`}
      aria-label="ช่องทางติดต่อลูกค้า"
    >
      <header className="crm-preferred-channel__head">
        <div>
          <h2>
            {variant === 'quotation'
              ? `ติดต่อลูกค้าทาง ${label} ก่อนส่งใบเสนอราคา`
              : `ติดต่อกลับทาง ${label}`}
          </h2>
          <p className="muted">
            {variant === 'quotation'
              ? 'คุยและสรุปความต้องการนอกระบบก่อน — ใบเสนอราคาในระบบส่งหลังลูกค้าพร้อม'
              : 'ลูกค้าเลือกช่องทางนี้จากฟอร์มติดต่อ — คุยนอกระบบจนกว่าจะชำระและเริ่มงาน'}
          </p>
        </div>
        <span className={`crm-preferred-channel__badge crm-preferred-channel__badge--${ch}`}>
          {label}
        </span>
      </header>

      <div className="crm-preferred-channel__actions">
        {ch === 'line' ? (
          <button
            type="button"
            className="crm-btn crm-btn--primary"
            onClick={() =>
              void openStaffLineChat(
                lineIds.line_oa_chat_user_id ?? lineIds.line_user_id,
                { mode: lineIds.line_oa_chat_user_id ? 'direct' : 'auto' },
              )
            }
          >
            {staffOpenChannelLabel(ch)}
          </button>
        ) : (
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn crm-btn--primary"
          >
            {staffOpenChannelLabel(ch)}
          </a>
        )}
        {ch === 'line' && lead.line_id && (
          <span className="crm-preferred-channel__meta">
            LINE ID ลูกค้า: <strong>{lead.line_id}</strong>
          </span>
        )}
        {ch === 'facebook' && lead.facebook_psid && (
          <span className="crm-preferred-channel__meta">
            Facebook ID: <strong>{lead.facebook_psid}</strong>
          </span>
        )}
        {ch === 'facebook' && lead.facebook && (
          <span className="crm-preferred-channel__meta">
            เพจ/FB: <strong>{lead.facebook}</strong>
          </span>
        )}
        {ch === 'facebook' && !lead.facebook && (
          <span className="crm-preferred-channel__meta muted">
            แนะนำให้ลูกค้าทักเพจ{' '}
            <a href={NPCREATE_FACEBOOK_MESSENGER_URL} target="_blank" rel="noopener noreferrer">
              NP Create
            </a>
          </span>
        )}
      </div>

      {ch === 'line' && (
        <LeadLineOaChatIdField
          lead={lead}
          readOnly={readOnly}
          onSaved={onLeadUpdated}
        />
      )}

      {variant === 'default' && (
        <ol className="crm-preferred-channel__checklist">
          {EXTERNAL_SALES_CHECKLIST.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      {ch === 'line' && variant === 'default' && (
        <p className="crm-preferred-channel__footnote muted">
          OA:{' '}
          <a href={openHref} target="_blank" rel="noopener noreferrer">
            {openHref.replace(/^https?:\/\//, '')}
          </a>
        </p>
      )}
    </section>
  )
}
