import { formatThaiBaht } from '../../../shared/payment/buildPaymentInstructionsMessage'
import type { PaymentSlipVerifyingItem } from '../../modules/finance/types/paymentSlipQueue'
import '../../modules/crm/crm.css'
import './home-dashboard.css'

export function HomeSlipVerifyingPanel({
  items,
  loading,
  error,
}: {
  items: PaymentSlipVerifyingItem[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return <p className="muted">กำลังโหลดรายการกำลังตรวจสลิป…</p>
  }

  if (error) {
    return <p className="crm-error">{error}</p>
  }

  if (items.length === 0) {
    return null
  }

  return (
    <ul className="home-payment-queue" aria-label="สลิปกำลังตรวจสอบอัตโนมัติ">
      {items.map((item) => (
        <li key={item.id} className="home-payment-queue__item">
          <div className="home-payment-queue__main">
            <span className="home-payment-queue__badge home-payment-queue__badge--verifying">
              กำลังตรวจสอบอัตโนมัติ
            </span>
            <p className="home-payment-queue__title">
              {item.customer_brand_name?.trim() || 'ลูกค้า'}
              {item.quotation_number ? (
                <span className="muted"> · {item.quotation_number}</span>
              ) : null}
            </p>
            <p className="home-payment-queue__meta">ยอด {formatThaiBaht(item.total_amount)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
