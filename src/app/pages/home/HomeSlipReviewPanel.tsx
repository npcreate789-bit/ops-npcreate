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

  const sorted = [...items].sort((a, b) => {
    const aFlag = isFlagged(a) ? 0 : 1
    const bFlag = isFlagged(b) ? 0 : 1
    if (aFlag !== bFlag) return aFlag - bFlag
    return (
      new Date(b.customer_slip_uploaded_at ?? 0).getTime() -
      new Date(a.customer_slip_uploaded_at ?? 0).getTime()
    )
  })

  return (
    <ul className="home-payment-queue" aria-label="รายการรอตรวจสลิปชำระเงิน">
      {sorted.map((item) => {
        const expected = item.quotation_total ?? item.total_amount
        const detected = item.slip_detected_amount
        const mismatch = detected != null && Math.abs(Number(detected) - Number(expected)) > 1
        const conf = item.verification_confidence
        const lowConf = conf != null && conf < 0.6
        const flagged = lowConf || mismatch
        return (
          <li
            key={item.id}
            className={`home-payment-queue__item${
              flagged ? ' home-payment-queue__item--flagged' : ''
            }`}
          >
            <div className="home-payment-queue__main">
              <span className="home-payment-queue__badge">รอตรวจสลิป (มือ)</span>
              {flagged ? (
                <span className="home-payment-queue__warn-badge" aria-label="ต้องตรวจซ้ำ">
                  ⚠ ตรวจซ้ำ
                </span>
              ) : null}
              <p className="home-payment-queue__title">
                {item.customer_brand_name?.trim() || 'ลูกค้า'}
                {item.quotation_number ? (
                  <span className="muted"> · {item.quotation_number}</span>
                ) : null}
              </p>
              <p className="home-payment-queue__meta">
                ยอดใบ {formatThaiBaht(expected)}
                {detected != null ? (
                  <>
                    {' · '}
                    <span className={mismatch ? 'home-payment-queue__mismatch' : undefined}>
                      OCR {formatThaiBaht(detected)}
                      {mismatch ? ' ⚠' : ''}
                    </span>
                  </>
                ) : null}
                {conf != null ? (
                  <>
                    {' · '}
                    <span className={lowConf ? 'home-payment-queue__low-conf' : undefined}>
                      {Math.round(conf * 100)}%
                    </span>
                  </>
                ) : null}
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
        )
      })}
    </ul>
  )
}

function isFlagged(item: PaymentSlipReviewItem): boolean {
  const expected = item.quotation_total ?? item.total_amount
  const detected = item.slip_detected_amount
  const mismatch = detected != null && Math.abs(Number(detected) - Number(expected)) > 1
  const conf = item.verification_confidence
  const lowConf = conf != null && conf < 0.6
  return mismatch || lowConf
}
