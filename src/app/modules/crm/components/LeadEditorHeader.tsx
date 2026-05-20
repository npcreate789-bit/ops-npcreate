import { Link } from 'react-router-dom'
import { preferredChannelLabel } from '../constants'
import type { LeadStatus, PreferredContactChannel } from '../types'
import { LeadStatusBadge } from './LeadStatusBadge'
import '../crm.css'

interface LeadEditorHeaderProps {
  backTo?: string
  eyebrow: string
  title: string
  subtitle?: string | null
  status?: LeadStatus
  preferredContactChannel?: PreferredContactChannel | null
}

export function LeadEditorHeader({
  backTo = '/app/crm',
  eyebrow,
  title,
  subtitle,
  status,
  preferredContactChannel,
}: LeadEditorHeaderProps) {
  const channel = preferredContactChannel
    ? preferredChannelLabel(preferredContactChannel)
    : null

  return (
    <header className="crm-lead-header">
      <Link to={backTo} className="crm-lead-header__back">
        <span className="crm-lead-header__back-icon" aria-hidden>
          ←
        </span>
        กลับรายการ
      </Link>

      <div className="crm-lead-header__panel">
        <div className="crm-lead-header__main">
          <p className="crm-lead-header__eyebrow">{eyebrow}</p>
          <h1 className="crm-lead-header__title">{title}</h1>
          {subtitle ? <p className="crm-lead-header__subtitle">{subtitle}</p> : null}
        </div>

        {(status || channel) && (
          <div className="crm-lead-header__meta">
            {status ? (
              <LeadStatusBadge status={status} />
            ) : null}
            {channel && preferredContactChannel ? (
              <span
                className={`crm-lead-header__channel crm-lead-header__channel--${preferredContactChannel}`}
              >
                {channel}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </header>
  )
}
