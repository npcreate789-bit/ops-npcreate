import { useEffect, useState } from 'react'
import { getLeadFileUrl } from '../api/leads'
import { isLeadFileImage, isLeadFilePdf, leadFileDisplayName } from '../leadFiles'

interface LeadFilePreviewProps {
  path: string
  fileName: string
  onClose?: () => void
}

export function LeadFilePreview({ path, fileName, onClose }: LeadFilePreviewProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const label = leadFileDisplayName(fileName)
  const pdf = isLeadFilePdf(path) || isLeadFilePdf(fileName)
  const image = !pdf && (isLeadFileImage(path) || isLeadFileImage(fileName))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setViewUrl(null)
    setDownloadUrl(null)

    Promise.all([
      getLeadFileUrl(path, { download: false }),
      getLeadFileUrl(path, { download: true }),
    ])
      .then(([view, download]) => {
        if (cancelled) return
        if (!view) {
          setError('ไม่สามารถโหลดไฟล์ได้')
          return
        }
        setViewUrl(view)
        setDownloadUrl(download ?? view)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path])

  if (loading) {
    return <p className="muted crm-attachment-preview__status">กำลังโหลดตัวอย่าง…</p>
  }

  if (error) {
    return <p className="crm-error crm-attachment-preview__status">{error}</p>
  }

  if (!viewUrl) return null

  return (
    <div className="crm-attachment-preview">
      <div className="crm-attachment-preview__header">
        <p className="crm-attachment-preview__title">
          ตัวอย่าง: <strong>{label}</strong>
        </p>
        {onClose && (
          <button type="button" className="crm-btn crm-btn--ghost" onClick={onClose}>
            ปิดตัวอย่าง
          </button>
        )}
      </div>
      {pdf ? (
        <iframe
          title={label}
          src={viewUrl}
          className="crm-attachment-preview__frame crm-attachment-preview__frame--pdf"
        />
      ) : image ? (
        <img src={viewUrl} alt={label} className="crm-attachment-preview__img" />
      ) : (
        <p className="muted">
          ไม่รองรับพรีวิวประเภทนี้ในระบบ — ใช้ปุ่มเปิดหรือดาวน์โหลดด้านล่าง
        </p>
      )}
      <div className="crm-attachment-preview__actions">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="crm-btn crm-btn--ghost"
        >
          เปิดในแท็บใหม่
        </a>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={label}
            className="crm-btn crm-btn--ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            ดาวน์โหลด
          </a>
        )}
      </div>
    </div>
  )
}
