import { Link } from 'react-router-dom'
import { formatBangkokDateTime } from '../../../shared/dates/bangkok'
import { formatThaiBaht } from '../../../shared/payment/buildPaymentInstructionsMessage'
import type { QuotationPaymentQueueItem } from '../../modules/sales/types/paymentQueue'
import '../../modules/crm/crm.css'
import './home-dashboard.css'

function formatAcceptedAt(at: string | null): string {
  if (!at) return '—'
  return formatBangkokDateTime(at)
}

export function HomePaymentQueuePanel({
  items,
  loading,
  error,
  onSendPayment,
}: {
  items: QuotationPaymentQueueItem[]
  loading: boolean
  error: string | null
  onSendPayment: (quotationId: string) => void
}) {
  if (loading) {
    return <p className="muted">กำลังโหลดรายการรอส่งชำระเงิน…</p>
  }

  if (error) {
    return <p className="crm-error">{error}</p>
  }

  if (items.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        ไม่มีใบเสนอราคาที่รอส่งข้อมูลชำระเงิน
      </p>
    )
  }

  return (
    <ul className="home-payment-queue" aria-label="รายการรอส่งข้อมูลชำระเงิน">
      {items.map((item) => (
        <li key={item.id} className="home-payment-queue__item">
          <div className="home-payment-queue__main">
            <span
              className={`home-payment-queue__badge${item.is_sla_overdue ? ' home-payment-queue__badge--overdue' : ''}`}
            >
              {item.is_sla_overdue ? 'เกิน SLA · ส่งบัญชีด่วน' : 'ยอมรับแล้ว · รอส่งชำระ'}
            </span>
            <p className="home-payment-queue__title">
              {item.lead_brand_name?.trim() || 'ลูกค้า'}
              <span className="muted"> · {item.quotation_number}</span>
            </p>
            <p className="home-payment-queue__meta">
              ยอด {formatThaiBaht(item.total)}
              {item.accepted_at ? ` · ${formatAcceptedAt(item.accepted_at)}` : ''}
            </p>
          </div>
          <div className="home-payment-queue__actions">
            <button
              type="button"
              className="crm-btn crm-btn--primary"
              onClick={() => onSendPayment(item.id)}
            >
              ส่งข้อมูลชำระเงิน
            </button>
            {item.lead_id ? (
              <Link to={`/app/crm/${item.lead_id}`} className="crm-btn crm-btn--ghost">
                แชท
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
