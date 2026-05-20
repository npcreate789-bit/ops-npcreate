import { useState } from 'react'
import { lineStickerAnimationUrl, lineStickerStaticUrl } from '../../../../shared/line/lineMessageDisplay'

interface LeadLineStickerProps {
  stickerId: string
  className?: string
  alt?: string
}

export function LeadLineSticker({
  stickerId,
  className = 'crm-line-chat__sticker',
  alt = 'สติกเกอร์ LINE',
}: LeadLineStickerProps) {
  const animUrl = lineStickerAnimationUrl(stickerId)
  const staticUrl = lineStickerStaticUrl(stickerId)
  const [src, setSrc] = useState(animUrl ?? staticUrl)
  const [stage, setStage] = useState<'animation' | 'static' | 'failed'>(
    animUrl ? 'animation' : staticUrl ? 'static' : 'failed',
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
