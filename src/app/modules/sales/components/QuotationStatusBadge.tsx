import { quotationStatusLabel } from '../constants'
import type { QuotationStatus } from '../types'
import '../sales.css'

const STATUS_CLASS: Record<QuotationStatus, string> = {
  draft: 'qt-badge--gray',
  sent: 'qt-badge--blue',
  viewed: 'qt-badge--blue',
  accepted: 'qt-badge--green',
  awaiting_payment: 'qt-badge--amber',
  paid: 'qt-badge--green',
  cancelled: 'qt-badge--red',
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  return (
    <span className={`qt-badge ${STATUS_CLASS[status]}`}>{quotationStatusLabel(status)}</span>
  )
}
