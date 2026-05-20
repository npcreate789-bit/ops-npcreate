import { useEffect, useState } from 'react'
import {
  lineMessageTypeLabel,
  lineStickerImageUrl,
} from '../../../../shared/line/lineMessageDisplay'
import { fetchLineMessageContentObjectUrl } from '../../../../shared/line/lineMessageContentUrl'
import { getLeadFileUrl } from '../api/leads'
import type { LeadLineMessage } from '../types/leadLineChat'

function metaString(metadata: Record<string, unknown>, key: string): string | null {
  const v = metadata[key]
  if (v == null) return null
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (typeof v === 'number') return String(v)
  return null
}

function LeadStorageImagePreview({ storagePath }: { storagePath: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getLeadFileUrl(storagePath).then((url) => {
      if (cancelled) return
      if (!url) {
        setFailed(true)
        return
      }
      setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [storagePath])

  if (failed) {
    return <p className="crm-line-chat__media-fallback muted">ไม่สามารถโหลดรูป</p>
  }
  if (!src) {
    return <p className="crm-line-chat__media-fallback muted">กำลังโหลดรูป…</p>
  }

  return (
    <img className="crm-line-chat__image" src={src} alt="รูปที่ส่ง" loading="lazy" />
  )
}

function LineImagePreview({ contentMessageId }: { contentMessageId: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    void fetchLineMessageContentObjectUrl(contentMessageId).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      if (!url) {
        setFailed(true)
        return
      }
      objectUrl = url
      setSrc(url)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [contentMessageId])

  if (failed) {
    return <p className="crm-line-chat__media-fallback muted">ไม่สามารถโหลดรูป — เปิดใน chat.line.biz</p>
  }
  if (!src) {
    return <p className="crm-line-chat__media-fallback muted">กำลังโหลดรูป…</p>
  }

  return (
    <img
      className="crm-line-chat__image"
      src={src}
      alt="รูปจาก LINE"
      loading="lazy"
    />
  )
}

interface LeadLineMessageBodyProps {
  message: LeadLineMessage
}

export function LeadLineMessageBody({ message }: LeadLineMessageBodyProps) {
  const metadata = message.metadata ?? {}
  const typeLabel = lineMessageTypeLabel(message.message_type)

  if (message.message_type === 'text') {
    return <p className="crm-line-chat__body">{message.body}</p>
  }

  if (message.message_type === 'sticker') {
    const stickerId = metaString(metadata, 'stickerId')
    const stickerSrc = lineStickerImageUrl(stickerId ?? undefined)
    return (
      <div className="crm-line-chat__media">
        <span className="crm-line-chat__type-tag">{typeLabel}</span>
        {stickerSrc ? (
          <img className="crm-line-chat__sticker" src={stickerSrc} alt="สติกเกอร์ LINE" loading="lazy" />
        ) : (
          <p className="crm-line-chat__body">{message.body}</p>
        )}
      </div>
    )
  }

  if (message.message_type === 'image') {
    const contentId =
      metaString(metadata, 'line_content_message_id') ?? message.line_message_id
    const storagePath = metaString(metadata, 'storage_path')
    return (
      <div className="crm-line-chat__media">
        <span className="crm-line-chat__type-tag">{typeLabel}</span>
        {contentId ? (
          <LineImagePreview contentMessageId={contentId} />
        ) : storagePath ? (
          <LeadStorageImagePreview storagePath={storagePath} />
        ) : (
          <p className="crm-line-chat__body">{message.body}</p>
        )}
      </div>
    )
  }

  if (message.message_type === 'location') {
    const lat = metadata.latitude
    const lng = metadata.longitude
    const mapsUrl =
      typeof lat === 'number' && typeof lng === 'number'
        ? `https://www.google.com/maps?q=${lat},${lng}`
        : null
    return (
      <div className="crm-line-chat__media">
        <span className="crm-line-chat__type-tag">{typeLabel}</span>
        <p className="crm-line-chat__body">{message.body}</p>
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="crm-line-chat__map-link">
            เปิดในแผนที่
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div className="crm-line-chat__media">
      <span className="crm-line-chat__type-tag">{typeLabel}</span>
      <p className="crm-line-chat__body">{message.body}</p>
    </div>
  )
}
