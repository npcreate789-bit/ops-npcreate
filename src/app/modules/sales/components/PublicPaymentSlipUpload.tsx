import { useRef, useState, type ChangeEvent } from 'react'
import { uploadPublicPaymentSlip } from '../api/publicPaymentSlip'
import '../../crm/crm.css'

export function PublicPaymentSlipUpload({
  token,
  disabled,
  onSubmitted,
}: {
  token: string
  disabled?: boolean
  onSubmitted?: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleFile(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file || disabled || done) return

    setBusy(true)
    setError(null)
    try {
      await uploadPublicPaymentSlip(token, file)
      setDone(true)
      onSubmitted?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className="crm-banner crm-banner--ok" role="status">
        ส่งสลิปแล้ว — ทีมงานจะตรวจสอบและยืนยันการชำระเงิน
      </p>
    )
  }

  return (
    <div className="public-qt-slip">
      <p className="muted" style={{ margin: '0 0 0.75rem' }}>
        อัปโหลดสลิปโอนเงิน (JPG, PNG, WebP หรือ PDF ไม่เกิน 10 MB)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="public-qt-slip__input"
        disabled={disabled || busy}
        onChange={(e) => void handleFile(e)}
        aria-label="เลือกไฟล์สลิป"
      />
      <button
        type="button"
        className="crm-btn crm-btn--primary"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'กำลังอัปโหลด…' : 'เลือกไฟล์สลิป'}
      </button>
      {error ? <p className="crm-error">{error}</p> : null}
    </div>
  )
}
