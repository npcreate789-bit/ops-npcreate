import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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
  const doneRef = useRef<HTMLParagraphElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (done) {
      doneRef.current?.focus()
    }
  }, [done])

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
      <p
        ref={doneRef}
        tabIndex={-1}
        className="crm-banner crm-banner--ok public-qt-slip__done"
        role="status"
      >
        ส่งสลิปแล้ว — ระบบกำลังตรวจสอบอัตโนมัติ (แจ้งทาง LINE ถ้ามีการตั้งค่า)
      </p>
    )
  }

  return (
    <div className="public-qt-slip">
      <p className="muted public-qt-slip__hint">
        อัปโหลดสลิปโอนเงิน (รูปภาพหรือ PDF ไม่เกิน 10 MB)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="public-qt-slip__input"
        disabled={disabled || busy}
        onChange={(e) => void handleFile(e)}
        aria-label="เลือกไฟล์สลิป"
      />
      <div className="public-qt-slip__actions">
        <button
          type="button"
          className="crm-btn crm-btn--primary public-qt-slip__btn"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'กำลังอัปโหลด…' : 'ถ่ายรูป / เลือกไฟล์สลิป'}
        </button>
      </div>
      {error ? <p className="crm-error">{error}</p> : null}
    </div>
  )
}
