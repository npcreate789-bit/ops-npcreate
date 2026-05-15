import type { LeadStatus } from '../types'
import { statusLabel } from '../constants'
import '../crm.css'

const STATUS_CLASS: Record<LeadStatus, string> = {
  interested: 'badge--blue',
  scheduled: 'badge--purple',
  quotation_sent: 'badge--cyan',
  awaiting_payment: 'badge--amber',
  won: 'badge--green',
  not_interested: 'badge--gray',
  follow_up: 'badge--orange',
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`lead-badge ${STATUS_CLASS[status]}`}>{statusLabel(status)}</span>
  )
}
