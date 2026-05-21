import type { PublicQuotation } from '../types'

function formatRejectedAt(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PublicPaymentStatusCard({ data }: { data: PublicQuotation }) {
  const v = data.payment_verification_status ?? 'none'
  const message = data.payment_status_message?.trim()
  const rejectedAt = data.slip_rejected_at?.trim() || null
  const rejectedNote = data.slip_rejected_note?.trim() || null
  const showReject = v === 'none' && Boolean(rejectedAt)

  if (!message && v === 'none' && !showReject) return null

  const isVerifying = v === 'verifying'
  const isReview = v === 'review_required'
  const isOk = v === 'confirmed' || data.status === 'paid'

  const className = [
    'public-qt-status-card',
    isVerifying ? 'public-qt-status-card--verifying' : '',
    isReview ? 'public-qt-status-card--review' : '',
    isOk ? 'public-qt-status-card--ok' : '',
    showReject ? 'public-qt-status-card--rejected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} role="status" aria-live="polite">
      {isVerifying ? (
        <span className="public-qt-status-card__spinner" aria-hidden />
      ) : null}
      <div>
        <p className="public-qt-status-card__title">
          {showReject
            ? 'สลิปไม่ผ่านการตรวจ'
            : isVerifying
              ? 'กำลังตรวจสอบสลิปอัตโนมัติ'
              : isReview
                ? 'ได้รับสลิปแล้ว'
                : isOk
                  ? 'ยืนยันการชำระเงินแล้ว'
                  : 'สถานะการชำระเงิน'}
        </p>
        <p className="public-qt-status-card__body">
          {showReject
            ? 'กรุณาตรวจสอบรายละเอียดและอัปโหลดสลิปใหม่ด้านล่าง'
            : (message ??
              (isVerifying
                ? 'ระบบกำลังตรวจสอบ — หน้านี้จะอัปเดตอัตโนมัติ'
                : 'โปรดรอสักครู่'))}
        </p>
        {showReject && rejectedNote ? (
          <p className="public-qt-status-card__reject-note">
            <span className="public-qt-status-card__reject-label">เหตุผลจากทีมงาน:</span>{' '}
            {rejectedNote}
          </p>
        ) : null}
        {showReject && rejectedAt ? (
          <p className="muted public-qt-status-card__hint">
            แจ้งเมื่อ {formatRejectedAt(rejectedAt)}
          </p>
        ) : null}
        {isVerifying ? (
          <p className="muted public-qt-status-card__hint">
            ปกติใช้เวลาไม่นาน — หน้านี้อัปเดตอัตโนมัติ
          </p>
        ) : null}
        {isReview ? (
          <p className="muted public-qt-status-card__hint">
            หากสลิปไม่ถูกต้อง ทีมงานจะแจ้งให้อัปโหลดใหม่ — หรือติดต่อ LINE
          </p>
        ) : null}
      </div>
    </div>
  )
}
