import { useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import type { LineStaffSticker } from '../../../../shared/line/lineStickers'
import { insertTextAtComposerCursor } from '../lineChatComposerUtils'
import { lineChatMessagePreview, lineChatReplySenderLabel } from '../leadLineChatUtils'
import type { LeadLineMessage } from '../types/leadLineChat'
import { LeadLineChatEmojiPicker } from './LeadLineChatEmojiPicker'
import { LeadLineChatStickerPicker } from './LeadLineChatStickerPicker'
import { LeadLineSticker } from './LeadLineSticker'

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
  selectedSticker: LineStaffSticker | null
  onStickerPick: (sticker: LineStaffSticker | null) => void
  onOpenSnippets: () => void
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

function IconEmoji() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSnippets() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h8M8 7h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSticker() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
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
  selectedSticker,
  onStickerPick,
  onOpenSnippets,
  onSubmit,
}: LeadLineChatComposerProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false)
  const locked = disabled || sending || outsideReplyWindow
  const canSend = Boolean(draft.trim() || imageFile || selectedSticker) && !locked

  function closePickers() {
    setEmojiPickerOpen(false)
    setStickerPickerOpen(false)
  }

  function insertEmoji(emoji: string) {
    const el = inputRef?.current
    if (!el) {
      onDraftChange(draft + emoji)
      return
    }
    onDraftChange(insertTextAtComposerCursor(el, draft, emoji))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) void onSubmit()
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return
    closePickers()
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

      {selectedSticker ? (
        <div className="crm-line-chat__attach-preview crm-line-chat__attach-preview--sticker">
          <LeadLineSticker
            stickerId={selectedSticker.stickerId}
            className="crm-line-chat__sticker crm-line-chat__sticker--preview"
          />
          <button
            type="button"
            className="crm-line-chat__attach-remove"
            onClick={() => onStickerPick(null)}
            aria-label="ลบสติกเกอร์"
          >
            <IconClose />
          </button>
        </div>
      ) : null}

      <div className="crm-line-chat__composer-wrap">
        <LeadLineChatEmojiPicker
          open={emojiPickerOpen}
          onClose={() => setEmojiPickerOpen(false)}
          onPick={insertEmoji}
        />
        <LeadLineChatStickerPicker
          open={stickerPickerOpen}
          onClose={() => setStickerPickerOpen(false)}
          onSelect={(sticker) => {
            onStickerPick(sticker)
            onImagePick(null)
            setEmojiPickerOpen(false)
          }}
        />

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
                if (file) onStickerPick(null)
                onImagePick(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className={`crm-line-chat__tool-btn${emojiPickerOpen ? ' crm-line-chat__tool-btn--active' : ''}`}
              disabled={locked}
              onClick={() => {
                setStickerPickerOpen(false)
                setEmojiPickerOpen((v) => !v)
              }}
              aria-label="อีโมจิ"
              title="อีโมจิ"
              aria-expanded={emojiPickerOpen}
            >
              <IconEmoji />
            </button>
            <button
              type="button"
              className="crm-line-chat__tool-btn"
              disabled={locked}
              onClick={() => {
                closePickers()
                fileRef.current?.click()
              }}
              aria-label="แนบรูปภาพ"
              title="แนบรูป"
            >
              <IconAttach />
            </button>
            <button
              type="button"
              className={`crm-line-chat__tool-btn${stickerPickerOpen ? ' crm-line-chat__tool-btn--active' : ''}`}
              disabled={locked}
              onClick={() => {
                setEmojiPickerOpen(false)
                setStickerPickerOpen((v) => !v)
              }}
              aria-label="สติกเกอร์"
              title="สติกเกอร์"
              aria-expanded={stickerPickerOpen}
            >
              <IconSticker />
            </button>
            <button
              type="button"
              className="crm-line-chat__tool-btn"
              disabled={locked}
              onClick={() => {
                closePickers()
                onOpenSnippets()
              }}
              aria-label="ชุดข้อความ"
              title="ชุดข้อความ"
            >
              <IconSnippets />
            </button>
          </div>

          <textarea
            ref={inputRef}
            id={inputId}
            className="crm-line-chat__input"
            rows={1}
            placeholder={
              outsideReplyWindow
                ? 'รอลูกค้าทักใหม่…'
                : 'พิมพ์ข้อความ… (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)'
            }
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
      </div>
    </form>
  )
}
