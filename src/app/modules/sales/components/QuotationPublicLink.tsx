import { useState } from 'react'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { ensureQuotationPdfDownloadUrl } from '../api/quotationPdf'
import { ensureQuotationPublicToken, quotationPublicUrl } from '../api/quotations'
import { isQuotationSentLike } from '../constants'
import type { Quotation } from '../types'
import '../sales.css'

interface QuotationPublicLinkProps {
  quotation: Quotation
  onTokenReady?: (token: string) => void
}

export function QuotationPublicLink({ quotation, onTokenReady }: QuotationPublicLinkProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState(quotation.public_token)

  if (!isQuotationSentLike(quotation.status)) {
    return (
      <p className="muted qt-public-link__hint">
        บันทึกสถานะเป็น &quot;ส่งแล้ว&quot; ขึ้นไปก่อน จึงจะสร้างลิงก์ให้ลูกค้าเปิดดูและยอมรับได้
      </p>
    )
  }

  async function resolveToken(): Promise<string> {
    if (token) return token
    const next = await ensureQuotationPublicToken(quotation.id)
    setToken(next)
    onTokenReady?.(next)
    return next
  }

  async function handleCopy() {
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const resolved = await resolveToken()
      await navigator.clipboard.writeText(quotationPublicUrl(resolved))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'คัดลอกลิงก์ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleOpen() {
    setBusy(true)
    setError(null)
    try {
      const resolved = await resolveToken()
      window.open(quotationPublicUrl(resolved), '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เปิดลิงก์ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handlePdfDownload(regenerate = false) {
    setBusy(true)
    setError(null)
    try {
      const r = await ensureQuotationPdfDownloadUrl(quotation.id, { regenerate })
      if (!r.ok) throw new Error(r.error)
      window.open(r.pdfUrl, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สร้าง PDF ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="qt-public-link">
      <p className="qt-public-link__lead">
        ส่งลิงก์ออนไลน์หรือ PDF ให้ลูกค้า — ระบบบันทึกเมื่อเปิดดูและเมื่อกดยอมรับ
      </p>
      <div className="qt-public-link__actions">
        <button
          type="button"
          className="crm-btn crm-btn--primary"
          disabled={busy}
          onClick={() => void handleCopy()}
        >
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์ลูกค้า'}
        </button>
        <button
          type="button"
          className="crm-btn"
          disabled={busy}
          onClick={() => void handleOpen()}
        >
          เปิดตัวอย่าง
        </button>
        <button
          type="button"
          className="crm-btn crm-btn--ghost"
          disabled={busy}
          onClick={() => void handlePdfDownload(false)}
          title="สร้าง PDF บนระบบ (ใช้เมื่อส่ง LINE อัตโนมัติด้วย)"
        >
          {busy ? 'กำลังสร้าง…' : 'ดาวน์โหลด PDF'}
        </button>
      </div>
      {(quotation.viewed_at || quotation.accepted_at) && (
        <ul className="qt-public-link__meta muted">
          {quotation.viewed_at && (
            <li>เปิดดูครั้งแรก: {formatBangkokDateTime(quotation.viewed_at)}</li>
          )}
          {quotation.accepted_at && (
            <li>ยอมรับเมื่อ: {formatBangkokDateTime(quotation.accepted_at)}</li>
          )}
        </ul>
      )}
      {error && <p className="crm-error">{error}</p>}
    </div>
  )
}
