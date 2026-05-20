import { useState } from 'react'
import { lineStickerAnimationUrl, lineStickerStaticUrl } from '../../../../shared/line/lineMessageDisplay'

interface LeadLineStickerProps {
  stickerId: string
  className?: string
  alt?: string
  /** ใน picker ใช้รูปนิ่ง — ขนาดสม่ำเสมอ */
  preferStatic?: boolean
}

export function LeadLineSticker({
  stickerId,
  className = 'crm-line-chat__sticker',
  alt = 'สติกเกอร์ LINE',
  preferStatic = false,
}: LeadLineStickerProps) {
  const animUrl = preferStatic ? null : lineStickerAnimationUrl(stickerId)
  const staticUrl = lineStickerStaticUrl(stickerId)
  const [src, setSrc] = useState(staticUrl ?? animUrl)
  const [stage, setStage] = useState<'animation' | 'static' | 'failed'>(
    staticUrl ? 'static' : animUrl ? 'animation' : 'failed',
  )

  if (stage === 'failed' || !src) {
    return <p className="crm-line-chat__media-fallback muted">ไม่สามารถโหลดสติกเกอร์</p>
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (stage === 'animation' && staticUrl) {
          setStage('static')
          setSrc(staticUrl)
          return
        }
        setStage('failed')
      }}
    />
  )
}
