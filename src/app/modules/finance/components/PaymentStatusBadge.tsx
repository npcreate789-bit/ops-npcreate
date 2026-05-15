import type { PaymentStatus } from '../types'
import { paymentStatusLabel } from '../constants'
import '../finance.css'

const CLASS: Record<PaymentStatus, string> = {
  pending: 'pay-badge--amber',
  paid: 'pay-badge--green',
  overdue: 'pay-badge--red',
  cancelled: 'pay-badge--gray',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`pay-badge ${CLASS[status]}`}>{paymentStatusLabel(status)}</span>
  )
}
