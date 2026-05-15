import { useEffect, useState } from 'react'
import { getPaymentSlipUrl } from '../api/payments'
import '../finance.css'

function isPdfPath(path: string): boolean {
  const lower = path.toLowerCase()
  return lower.endsWith('.pdf') || lower.startsWith('data:application/pdf')
}

interface PaymentSlipPreviewProps {
  slipPath: string | null
}

export function PaymentSlipPreview({ slipPath }: PaymentSlipPreviewProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!slipPath) {
      setUrl(null)
      setLoadError(null)
      return
    }

    if (slipPath.startsWith('data:')) {
      setUrl(slipPath)
      setLoadError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getPaymentSlipUrl(slipPath)
      .then((signedUrl) => {
        if (!cancelled) {
          if (!signedUrl) setLoadError('ไม่สามารถสร้างลิงก์ดูสลิปได้')
          else setUrl(signedUrl)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'โหลดสลิปไม่สำเร็จ')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slipPath])

  if (!slipPath) {
    return <p className="muted finance-slip-empty">ยังไม่มีสลิปแนบ</p>
  }

  if (loading) {
    return <p className="muted">กำลังโหลดสลิป...</p>
  }

  if (loadError) {
    return <p className="crm-error">{loadError}</p>
  }

  if (!url) return null

  const pdf = isPdfPath(slipPath)

  return (
    <div className="finance-slip-preview-wrap">
      {pdf ? (
        <iframe
          title="สลิปชำระเงิน"
          src={url}
          className="finance-slip-preview finance-slip-preview--pdf"
        />
      ) : (
        <img src={url} alt="สลิปชำระเงิน" className="finance-slip-preview" />
      )}
      <p className="finance-slip-actions">
        <a href={url} target="_blank" rel="noopener noreferrer" className="crm-btn crm-btn--ghost">
          เปิดในแท็บใหม่
        </a>
      </p>
    </div>
  )
}
