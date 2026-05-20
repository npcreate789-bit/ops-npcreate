import { useId, useRef, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { lineChatMessagePreview, lineChatReplySenderLabel } from '../leadLineChatUtils'
import type { LeadLineMessage } from '../types/leadLineChat'

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/*,.jpg,.jpeg,.png,.webp'

interface LeadLineChatComposerProps {
  inputRef?: RefObject<HTMLTextAreaElement | null>
  disabled: boolean
  sending: boolean
  outsideReplyWindow: boolean
  draft: string
  onDraftChange: (value: string) => void
  replyTo: LeadLineMessage | null
  onClearReply: () => void
  imageFile: File | null
  imagePreviewUrl: string | null
  onImagePick: (file: File | null) => void
  onSubmit: () => void | Promise<void>
}

function IconAttach() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LeadLineChatComposer({
  inputRef,
  disabled,
  sending,
  outsideReplyWindow,
  draft,
  onDraftChange,
  replyTo,
  onClearReply,
  imageFile,
  imagePreviewUrl,
  onImagePick,
  onSubmit,
}: LeadLineChatComposerProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const locked = disabled || sending || outsideReplyWindow
  const canSend = Boolean(draft.trim() || imageFile) && !locked

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void onSubmit()
    }
  }

  function handleFileChange(file: File | null) {
    if (!file) {
      onImagePick(null)
      return
    }
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      return
    }
    onImagePick(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return
    await onSubmit()
  }

  return (
    <form className="crm-line-chat__composer" onSubmit={(e) => void handleSubmit(e)}>
      <label className="crm-line-chat__label" htmlFor={inputId}>
        ข้อความ LINE
      </label>

      {outsideReplyWindow ? (
        <p className="crm-line-chat__composer-hint muted">
          ส่งจากระบบไม่ได้ชั่วคราว — ลูกค้าต้องทัก OA ใหม่ก่อน (นอกช่วง 24 ชม.)
        </p>
      ) : null}

      {replyTo ? (
        <div className="crm-line-chat__reply-bar">
          <div className="crm-line-chat__reply-bar-main">
            <span className="crm-line-chat__reply-bar-label">
              ตอบกลับ {lineChatReplySenderLabel(replyTo.direction)}
            </span>
            <span className="crm-line-chat__reply-bar-text">
              {lineChatMessagePreview(replyTo, 90)}
            </span>
          </div>
          <button
            type="button"
            className="crm-line-chat__reply-bar-close"
            onClick={onClearReply}
            aria-label="ยกเลิกตอบกลับ"
          >
            <IconClose />
          </button>
        </div>
      ) : null}

      {imagePreviewUrl ? (
        <div className="crm-line-chat__attach-preview">
          <img src={imagePreviewUrl} alt={imageFile?.name ?? 'รูปที่แนบ'} />
          <button
            type="button"
            className="crm-line-chat__attach-remove"
            onClick={() => onImagePick(null)}
            aria-label="ลบรูปที่แนบ"
          >
            <IconClose />
          </button>
        </div>
      ) : null}

      <div className="crm-line-chat__composer-dock">
        <div className="crm-line-chat__composer-tools">
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="crm-line-chat__file-input"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              handleFileChange(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="crm-line-chat__tool-btn"
            disabled={locked}
            onClick={() => fileRef.current?.click()}
            aria-label="แนบรูปภาพ"
            title="แนบรูป"
          >
            <IconAttach />
          </button>
        </div>

        <textarea
          ref={inputRef}
          id={inputId}
          className="crm-line-chat__input"
          rows={1}
          placeholder={outsideReplyWindow ? 'รอลูกค้าทักใหม่…' : 'พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)'}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={locked}
        />

        <button
          type="submit"
          className="crm-line-chat__send crm-line-chat__send--icon"
          disabled={!canSend}
          aria-label={sending ? 'กำลังส่ง' : 'ส่งข้อความ'}
          title="ส่ง"
        >
          {sending ? <span className="crm-line-chat__send-spinner" aria-hidden /> : <IconSend />}
        </button>
      </div>
    </form>
  )
}
