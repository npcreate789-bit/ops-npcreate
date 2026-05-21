import { Link } from 'react-router-dom'
import { formatBangkokDateTime } from '../../../shared/dates/bangkok'
import { formatThaiBaht } from '../../../shared/payment/buildPaymentInstructionsMessage'
import type { PaymentSlipReviewItem } from '../../modules/finance/types/paymentSlipQueue'
import '../../modules/crm/crm.css'
import './home-dashboard.css'

export function HomeSlipReviewPanel({
  items,
  loading,
  error,
}: {
  items: PaymentSlipReviewItem[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return <p className="muted">กำลังโหลดรายการรอตรวจสลิป…</p>
  }

  if (error) {
    return <p className="crm-error">{error}</p>
  }

  if (items.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        ไม่มีสลิปรอตรวจสอบ
      </p>
    )
  }

  return (
    <ul className="home-payment-queue" aria-label="รายการรอตรวจสลิปชำระเงิน">
      {items.map((item) => (
        <li key={item.id} className="home-payment-queue__item">
          <div className="home-payment-queue__main">
            <span className="home-payment-queue__badge">สลิปจากลูกค้า</span>
            <p className="home-payment-queue__title">
              {item.customer_brand_name?.trim() || 'ลูกค้า'}
              {item.quotation_number ? (
                <span className="muted"> · {item.quotation_number}</span>
              ) : null}
            </p>
            <p className="home-payment-queue__meta">
              ยอด {formatThaiBaht(item.total_amount)}
              {item.customer_slip_uploaded_at
                ? ` · ${formatBangkokDateTime(item.customer_slip_uploaded_at)}`
                : ''}
            </p>
          </div>
          <div className="home-payment-queue__actions">
            <Link
              to={`/app/finance/payments/${item.id}`}
              className="crm-btn crm-btn--primary"
            >
              ตรวจสลิป
            </Link>
          </div>
        </li>
      ))}
    </ul>
  )
}
