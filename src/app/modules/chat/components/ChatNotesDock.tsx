import { useState, type FormEvent } from 'react'
import type { ChatMessage, ChatMessageNote } from '../types'
import { chatMessagePreviewText } from '../utils/replyPreview'
import { formatChatBubbleTime } from '../utils/chatDisplay'
import '../chat.css'

interface ChatNotesDockProps {
  message: ChatMessage
  userId: string
  notes: ChatMessageNote[]
  saving: boolean
  onSave: (body: string) => void | Promise<void>
  onDelete: (noteId: string) => void | Promise<void>
  onClose: () => void
  onJumpToMessage: () => void
}

export function ChatNotesDock({
  message,
  userId,
  notes,
  saving,
  onSave,
  onDelete,
  onClose,
  onJumpToMessage,
}: ChatNotesDockProps) {
  const [draft, setDraft] = useState('')

  const senderLabel =
    message.sender_id === userId ? 'คุณ' : (message.sender_name?.trim() || 'ทีมงาน')
  const preview = chatMessagePreviewText(message)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || saving) return
    setDraft('')
    await onSave(text)
  }

  return (
    <section className="chat-notes-dock" aria-label="โน้ตภายในทีม">
      <div className="chat-notes-dock__toolbar">
        <label className="chat-notes-dock__search-hint visually-hidden">
          โซนโน้ตทีม
        </label>
        <div className="chat-notes-dock__context">
          <span className="chat-notes-dock__label">โน้ตต่อข้อความ</span>
          <button type="button" className="chat-notes-dock__source" onClick={onJumpToMessage}>
            <strong>{senderLabel}</strong>
            <span className="chat-notes-dock__preview">{preview}</span>
            <time dateTime={message.created_at}>{formatChatBubbleTime(message.created_at)}</time>
          </button>
        </div>
        <button
          type="button"
          className="chat-notes-dock__close"
          onClick={onClose}
          aria-label="ปิดโน้ต"
        >
          ปิดโน้ต
        </button>
      </div>

      <div className="chat-notes-dock__body">
        <ul className="chat-notes-dock__list">
          {notes.length === 0 && (
            <li className="chat-notes-dock__empty muted">ยังไม่มีโน้ต — เพิ่มบันทึกด้านล่าง</li>
          )}
          {notes.map((note) => {
            const mine = note.author_id === userId
            return (
              <li key={note.id} className="chat-notes-dock__item">
                <div className="chat-notes-dock__item-head">
                  <strong>{mine ? 'คุณ' : (note.author_name ?? 'ทีม')}</strong>
                  <time dateTime={note.updated_at}>{formatChatBubbleTime(note.updated_at)}</time>
                </div>
                <p className="chat-notes-dock__item-body">{note.body}</p>
                {mine && (
                  <button
                    type="button"
                    className="chat-notes-dock__delete"
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

        <form className="chat-notes-dock__form" onSubmit={(e) => void handleSubmit(e)}>
          <textarea
            className="chat-notes-dock__input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="เขียนโน้ตให้ทีม (ลูกค้าไม่เห็น)…"
            disabled={saving}
            aria-label="โน้ตใหม่"
          />
          <button type="submit" className="crm-btn crm-btn--primary" disabled={saving || !draft.trim()}>
            {saving ? 'กำลังบันทึก…' : 'เพิ่มโน้ต'}
          </button>
        </form>
      </div>
    </section>
  )
}
