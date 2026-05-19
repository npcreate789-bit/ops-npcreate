import { Link } from 'react-router-dom'
import type { AppRole } from '../../../shared/types/roles'
import { formatBangkokDateTime } from '../../../shared/dates/bangkok'
import { formatServiceInterests } from '../../../shared/packages/serviceInterests'
import { preferredContactChannelLabel } from '../../../shared/crm/preferredContactChannel'
import { LeadStatusBadge } from '../../modules/crm/components/LeadStatusBadge'
import { channelLabel } from '../../modules/crm/constants'
import type { Lead } from '../../modules/crm/types'
import { homeLeadDetailLink } from './access'

function inquiryDetailLine(lead: Lead): string {
  const parts: string[] = []
  if (lead.contact_name) parts.push(lead.contact_name)
  if (lead.phone) parts.push(lead.phone)
  const services = formatServiceInterests(lead.services_interested)
  if (services) parts.push(services)
  return parts.join(' · ') || 'ยังไม่มีรายละเอียดเพิ่มเติม'
}

function ContactRow({ lead, roles }: { lead: Lead; roles: AppRole[] }) {
  const { to, linkable, lockedLabel } = homeLeadDetailLink(roles, lead.id)
  const preferred = lead.preferred_contact_channel
    ? preferredContactChannelLabel(lead.preferred_contact_channel)
    : null

  const body = (
    <>
      <div className="home-contact__meta">
        <span className="home-contact__source">{channelLabel(lead.channel)}</span>
        {preferred ? (
          <span
            className={`crm-preferred-pill crm-preferred-pill--${lead.preferred_contact_channel}`}
          >
            ติดต่อกลับ: {preferred}
          </span>
        ) : null}
        <LeadStatusBadge status={lead.status} />
        <time className="home-contact__time">{formatBangkokDateTime(lead.created_at)}</time>
      </div>
      <p className="home-contact__title">{lead.brand_name}</p>
      <p className="home-contact__detail">{inquiryDetailLine(lead)}</p>
    </>
  )

  if (linkable) {
    return (
      <li className="home-contact__item">
        <Link to={to} className="home-contact__link">
          {body}
        </Link>
      </li>
    )
  }

  return (
    <li className="home-contact__item home-contact__item--locked">
      <div className="home-contact__static">{body}</div>
      <span className="work-hub__locked">{lockedLabel}</span>
    </li>
  )
}

export function HomeContactInquiries({
  items,
  roles,
  loading,
  error,
}: {
  items: Lead[]
  roles: AppRole[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return <p className="home-contact__status muted">กำลังโหลดรายการติดต่อจากฟอร์ม…</p>
  }
  if (error) {
    return <p className="home-contact__status crm-error">{error}</p>
  }
  if (items.length === 0) {
    return (
      <p className="home-contact__status muted">
        ยังไม่มีลูกค้าที่ส่งฟอร์มติดต่อในช่วง 45 วันที่ผ่านมา — ลิงก์แชร์{' '}
        <a href="/contact" target="_blank" rel="noreferrer">
          /contact
        </a>
      </p>
    )
  }

  return (
    <ul className="home-contact__list">
      {items.map((lead) => (
        <ContactRow key={lead.id} lead={lead} roles={roles} />
      ))}
    </ul>
  )
}
