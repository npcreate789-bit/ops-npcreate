import { useState, type FormEvent } from 'react'
import { formatChatBubbleTime } from '../utils/chatDisplay'
import type { ChatMessageNote } from '../types'
import '../chat.css'

interface ChatMessageNotesProps {
  notes: ChatMessageNote[]
  userId: string
  saving: boolean
  onSave: (body: string) => void | Promise<void>
  onDelete: (noteId: string) => void | Promise<void>
  onClose: () => void
}

export function ChatMessageNotes({
  notes,
  userId,
  saving,
  onSave,
  onDelete,
  onClose,
}: ChatMessageNotesProps) {
  const [draft, setDraft] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || saving) return
    setDraft('')
    await onSave(text)
  }

  return (
    <div className="chat-message-notes" onClick={(e) => e.stopPropagation()}>
      <div className="chat-message-notes__head">
        <span className="chat-message-notes__title">โน้ตภายในทีม</span>
        <span className="chat-message-notes__hint muted">ลูกค้าไม่เห็น</span>
        <button
          type="button"
          className="chat-message-notes__close"
          onClick={onClose}
          aria-label="ปิดโน้ต"
        >
          ×
        </button>
      </div>

      <ul className="chat-message-notes__list">
        {notes.length === 0 && (
          <li className="chat-message-notes__empty muted">ยังไม่มีโน้ต — เพิ่มบันทึกให้ทีม</li>
        )}
        {notes.map((note) => {
          const mine = note.author_id === userId
          return (
            <li key={note.id} className="chat-message-notes__item">
              <div className="chat-message-notes__meta">
                <strong>{mine ? 'คุณ' : (note.author_name ?? 'ทีม')}</strong>
                <time dateTime={note.updated_at} title={note.updated_at}>
                  {formatChatBubbleTime(note.updated_at)}
                </time>
              </div>
              <p className="chat-message-notes__body">{note.body}</p>
              {mine && (
                <button
                  type="button"
                  className="chat-message-notes__delete"
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

      <form className="chat-message-notes__form" onSubmit={(e) => void handleSubmit(e)}>
        <textarea
          className="chat-message-notes__input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="เขียนโน้ตให้ทีม…"
          disabled={saving}
          aria-label="โน้ตใหม่"
        />
        <button type="submit" className="crm-btn crm-btn--primary" disabled={saving || !draft.trim()}>
          {saving ? 'กำลังบันทึก…' : 'เพิ่มโน้ต'}
        </button>
      </form>
    </div>
  )
}
