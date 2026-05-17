import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { ChatMessage, ChatMessageNote } from '../types'
import { chatMessagePreviewText } from '../utils/replyPreview'
import { formatChatBubbleTime } from '../utils/chatDisplay'
import '../chat.css'

interface ChatNotesPopoverProps {
  message: ChatMessage
  userId: string
  notes: ChatMessageNote[]
  saving: boolean
  anchorEl: HTMLElement
  onSave: (body: string) => void | Promise<void>
  onDelete: (noteId: string) => void | Promise<void>
  onClose: () => void
}

function isUsableAnchorRect(rect: DOMRect): boolean {
  return rect.width > 0 || rect.height > 0 || rect.bottom > 0 || rect.right > 0
}

function readAnchorRect(anchor: HTMLElement): DOMRect | null {
  if (!anchor.isConnected) return null
  const rect = anchor.getBoundingClientRect()
  return isUsableAnchorRect(rect) ? rect : null
}

function computePosition(anchorRect: DOMRect, panel: HTMLElement) {
  const gap = 8
  const margin = 12
  const panelRect = panel.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let top = anchorRect.bottom + gap
  let left = anchorRect.left + anchorRect.width / 2 - panelRect.width / 2

  if (left < margin) left = margin
  if (left + panelRect.width > vw - margin) {
    left = vw - margin - panelRect.width
  }

  if (top + panelRect.height > vh - margin) {
    top = anchorRect.top - gap - panelRect.height
  }
  if (top < margin) top = margin

  return { top, left }
}

/** กลางจอ — ใช้เมื่อ anchor หลุดหลังลบโน้ต / รายการในแถบบนถูกถอด */
function computeCenteredPosition(panel: HTMLElement) {
  const margin = 12
  const panelRect = panel.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = (vw - panelRect.width) / 2
  let top = (vh - panelRect.height) / 2
  if (left < margin) left = margin
  if (top < margin) top = margin
  if (left + panelRect.width > vw - margin) left = vw - margin - panelRect.width
  if (top + panelRect.height > vh - margin) top = vh - margin - panelRect.height
  return { top, left }
}

export function ChatNotesPopover({
  message,
  userId,
  notes,
  saving,
  anchorEl,
  onSave,
  onDelete,
  onClose,
}: ChatNotesPopoverProps) {
  const [draft, setDraft] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const anchorRectRef = useRef<DOMRect | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const senderLabel =
    message.sender_id === userId ? 'คุณ' : (message.sender_name?.trim() || 'สมาชิก')
  const preview = chatMessagePreviewText(message)

  const applyPosition = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return

    const live = readAnchorRect(anchorEl)
    if (live) {
      anchorRectRef.current = live
    }

    const anchorRect = anchorRectRef.current
    if (anchorRect) {
      setCoords(computePosition(anchorRect, panel))
      return
    }

    setCoords(computeCenteredPosition(panel))
  }, [anchorEl])

  useLayoutEffect(() => {
    anchorRectRef.current = readAnchorRect(anchorEl)
    applyPosition()
  }, [anchorEl, applyPosition])

  useLayoutEffect(() => {
    applyPosition()
  }, [notes.length, applyPosition])

  useEffect(() => {
    window.addEventListener('resize', applyPosition)
    window.addEventListener('scroll', applyPosition, true)
    return () => {
      window.removeEventListener('resize', applyPosition)
      window.removeEventListener('scroll', applyPosition, true)
    }
  }, [applyPosition])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || saving) return
    setDraft('')
    await onSave(text)
  }

  return createPortal(
    <>
      <button
        type="button"
        className="chat-notes-popover__backdrop"
        aria-label="ปิดโน้ต"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="chat-notes-popover"
        role="dialog"
        aria-label="โน้ตข้อความ"
        style={
          coords
            ? { top: coords.top, left: coords.left, visibility: 'visible' }
            : { top: -9999, left: -9999, visibility: 'hidden' }
        }
      >
        <header className="chat-notes-popover__head">
          <div className="chat-notes-popover__title-wrap">
            <span className="chat-notes-popover__icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 4h10a2 2 0 0 1 2 2v11.2a.8.8 0 0 1-1.3.6L14 15H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8h6M9 11.5h4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <h3 className="chat-notes-popover__title">โน้ตข้อความ</h3>
              <p className="chat-notes-popover__hint muted">ทีมและลูกค้าในห้องนี้เห็นร่วมกัน</p>
            </div>
          </div>
          <button
            type="button"
            className="chat-notes-popover__close"
            onClick={onClose}
            aria-label="ปิด"
          >
            ×
          </button>
        </header>

        <p className="chat-notes-popover__context">
          <strong>{senderLabel}</strong>
          <span>{preview}</span>
          <time dateTime={message.created_at}>{formatChatBubbleTime(message.created_at)}</time>
        </p>

        <ul className="chat-notes-popover__list">
          {notes.length === 0 && (
            <li className="chat-notes-popover__empty muted">ยังไม่มีโน้ต</li>
          )}
          {notes.map((note) => {
            const mine = note.author_id === userId
            return (
              <li key={note.id} className="chat-notes-popover__item">
                <div className="chat-notes-popover__item-head">
                  <strong>{mine ? 'คุณ' : (note.author_name ?? 'สมาชิก')}</strong>
                  <time dateTime={note.updated_at}>{formatChatBubbleTime(note.updated_at)}</time>
                </div>
                <p>{note.body}</p>
                {mine && (
                  <button
                    type="button"
                    className="chat-notes-popover__delete"
                    disabled={saving}
                    onClick={() => void onDelete(note.id)}
                  >
                    ลบ
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <form className="chat-notes-popover__form" onSubmit={(e) => void handleSubmit(e)}>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="เขียนโน้ต…"
            disabled={saving}
            aria-label="โน้ตใหม่"
            autoFocus
          />
          <button type="submit" className="crm-btn crm-btn--primary" disabled={saving || !draft.trim()}>
            {saving ? 'กำลังบันทึก…' : 'เพิ่ม'}
          </button>
        </form>
      </div>
    </>,
    document.body,
  )
}
