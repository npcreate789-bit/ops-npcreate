import { Link } from 'react-router-dom'
import type { Lead } from '../types'
import {
  NPCREATE_FACEBOOK_MESSENGER_URL,
  openUrlForPreferredChannel,
  preferredContactChannelLabel,
  staffOpenChannelLabel,
  type PreferredContactChannel,
} from '../../../../shared/crm/preferredContactChannel'
import { computeLineOaChatSyncState } from '../../../../shared/line/lineOaChatSyncState'
import { useLeadLatestInboundLineUserId } from '../hooks/useLeadLatestInboundLineUserId'
import '../crm.css'

interface LeadPreferredChannelPanelProps {
  lead: Lead
  variant?: 'default' | 'quotation'
  readOnly?: boolean
  onLeadUpdated?: (lead: Lead) => void
}

function lineChannelStatus(sync: ReturnType<typeof computeLineOaChatSyncState>): {
  tone: 'ok' | 'muted' | 'wait'
  label: string
} {
  if (sync.canPush) {
    return {
      tone: 'ok',
      label: sync.shouldOfferInboundSync ? 'พร้อมส่งข้อความ' : 'เชื่อมต่อแล้ว',
    }
  }
  return { tone: 'wait', label: 'รอลูกค้าทัก OA' }
}

export function LeadPreferredChannelPanel({
  lead,
  variant = 'default',
  readOnly = false,
  onLeadUpdated,
}: LeadPreferredChannelPanelProps) {
  void readOnly
  void onLeadUpdated

  const channel = lead.preferred_contact_channel
  const isLineChannel = channel === 'line'
  const latestInboundLineUserId = useLeadLatestInboundLineUserId(
    isLineChannel ? lead.id : undefined,
  )

  if (!channel) return null

  const ch = channel as PreferredContactChannel
  const isLine = ch === 'line'

  /** หน้า Lead — แชท LINE ด้านล่างเป็นจุดเดียว ไม่แสดงการ์ดซ้ำ */
  if (isLine && variant === 'default') return null

  const label = preferredContactChannelLabel(ch)
  const lineIds = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const sync = isLine ? computeLineOaChatSyncState(lineIds, latestInboundLineUserId) : null
  const openHref = openUrlForPreferredChannel(ch, lineIds)

  const title =
    variant === 'quotation' ? `ติดต่อทาง ${label} ก่อนส่งใบเสนอราคา` : `ช่องทางติดต่อ: ${label}`

  const hint =
    variant === 'quotation'
      ? 'คุยและสรุปความต้องการก่อนส่งใบเสนอราคา'
      : 'ลูกค้าเลือกจากฟอร์มติดต่อ'

  return (
    <section
      className={`crm-channel-strip crm-channel-strip--${ch}${variant === 'quotation' ? ' crm-channel-strip--quotation' : ''}`}
      aria-label="ช่องทางติดต่อลูกค้า"
    >
      <div className="crm-channel-strip__main">
        <span className={`crm-channel-strip__icon crm-channel-strip__icon--${ch}`} aria-hidden>
          {isLine ? 'LINE' : label.slice(0, 1)}
        </span>
        <div className="crm-channel-strip__copy">
          <h2 className="crm-channel-strip__title">{title}</h2>
          <p className="crm-channel-strip__hint">{hint}</p>
        </div>
      </div>

      <div className="crm-channel-strip__actions">
        {isLine ? (
          <>
            {sync ? (
              <span
                className={`crm-channel-strip__status crm-channel-strip__status--${lineChannelStatus(sync).tone}`}
              >
                <span className="crm-channel-strip__status-dot" aria-hidden />
                {lineChannelStatus(sync).label}
              </span>
            ) : null}
            <Link to={`/app/crm/${lead.id}`} className="crm-btn crm-btn--ghost crm-channel-strip__link">
              แชทใน CRM
            </Link>
          </>
        ) : (
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            className="crm-btn crm-btn--primary crm-channel-strip__link"
          >
            {staffOpenChannelLabel(ch)}
          </a>
        )}
      </div>

      {ch === 'line' && lead.line_id ? (
        <p className="crm-channel-strip__meta">
          LINE ID <strong>{lead.line_id}</strong>
        </p>
      ) : null}
      {ch === 'facebook' && lead.facebook_psid ? (
        <p className="crm-channel-strip__meta">
          Facebook <strong>{lead.facebook_psid}</strong>
        </p>
      ) : null}
      {ch === 'facebook' && lead.facebook ? (
        <p className="crm-channel-strip__meta">
          เพจ <strong>{lead.facebook}</strong>
        </p>
      ) : null}
      {ch === 'facebook' && !lead.facebook ? (
        <p className="crm-channel-strip__meta muted">
          แนะนำทักเพจ{' '}
          <a href={NPCREATE_FACEBOOK_MESSENGER_URL} target="_blank" rel="noopener noreferrer">
            NP Create
          </a>
        </p>
      ) : null}
    </section>
  )
}
