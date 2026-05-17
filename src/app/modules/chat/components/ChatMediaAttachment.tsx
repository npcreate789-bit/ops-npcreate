import { formatMediaByteSize, isChatImageMime } from '../api/chatFiles'
import '../chat.css'

interface ChatMediaAttachmentProps {
  fileUrl: string | null
  fileError: string | null
  mime: string | null | undefined
  name: string | null | undefined
  body: string
  size: number | null | undefined
}

export function ChatMediaAttachment({
  fileUrl,
  fileError,
  mime,
  name,
  body,
  size,
}: ChatMediaAttachmentProps) {
  const displayName = name ?? body
  const sizeLabel = formatMediaByteSize(size)
  const isImage = isChatImageMime(mime)
  const isAudio = mime?.startsWith('audio/')
  const isVideo = mime?.startsWith('video/')

  if (fileError) {
    return <p className="crm-error chat-bubble__file-error">{fileError}</p>
  }

  if (isImage && fileUrl) {
    return (
      <>
        <a href={fileUrl} target="_blank" rel="noreferrer noopener" className="chat-bubble__image-link">
          <img
            src={fileUrl}
            alt={displayName ?? 'รูปแนบ'}
            className="chat-bubble__image"
            loading="lazy"
          />
        </a>
        <a href={fileUrl} target="_blank" rel="noreferrer noopener" className="chat-bubble__file-open">
          เปิดรูปเต็ม
        </a>
      </>
    )
  }

  if (isAudio && fileUrl) {
    return (
      <div className="chat-bubble__audio-wrap">
        <span className="chat-bubble__media-label">🎤 ข้อความเสียง</span>
        <audio className="chat-bubble__audio" controls preload="metadata" src={fileUrl}>
          เบราว์เซอร์ไม่รองรับการเล่นเสียง
        </audio>
        {sizeLabel && <span className="muted chat-bubble__media-meta">{sizeLabel}</span>}
        <a href={fileUrl} target="_blank" rel="noreferrer noopener" className="chat-bubble__file-open">
          ดาวน์โหลด
        </a>
      </div>
    )
  }

  if (isVideo && fileUrl) {
    return (
      <div className="chat-bubble__video-wrap">
        <span className="chat-bubble__media-label">🎬 วิดีโอ</span>
        <video
          className="chat-bubble__video"
          controls
          playsInline
          preload="metadata"
          src={fileUrl}
        >
          เบราว์เซอร์ไม่รองรับการเล่นวิดีโอ
        </video>
        {sizeLabel && <span className="muted chat-bubble__media-meta">{sizeLabel}</span>}
        <a href={fileUrl} target="_blank" rel="noreferrer noopener" className="chat-bubble__file-open">
          เปิดวิดีโอเต็ม
        </a>
      </div>
    )
  }

  return (
    <>
      <div className="chat-bubble__file-card">
        <span className="chat-bubble__file-icon" aria-hidden>
          {isAudio ? '🎤' : isVideo ? '🎬' : '📄'}
        </span>
        <span className="chat-bubble__file-name">{displayName}</span>
        {sizeLabel && <span className="muted chat-bubble__media-meta">{sizeLabel}</span>}
      </div>
      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noreferrer noopener" className="chat-bubble__file-open">
          เปิดไฟล์
        </a>
      )}
    </>
  )
}
