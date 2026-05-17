import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import type { ChatMentionCandidate, ChatMessageTemplate } from '../types'
import { getActiveMentionQuery, insertMention } from '../utils/chatBody'
import { ChatVoiceRecorder } from './ChatVoiceRecorder'
import '../chat.css'

interface ChatComposerProps {
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void | Promise<void>
  onPickFile: () => void
  onPickVideo?: () => void
  onVoiceRecorded?: (file: File) => void | Promise<void>
  onVoiceError?: (message: string) => void
  sending: boolean
  disabled?: boolean
  templates?: ChatMessageTemplate[]
  mentionCandidates?: ChatMentionCandidate[]
  showTemplateSuggestions?: boolean
  placeholder?: string
}

export function ChatComposer({
  draft,
  onDraftChange,
  onSubmit,
  onPickFile,
  onPickVideo,
  onVoiceRecorded,
  onVoiceError,
  sending,
  disabled = false,
  templates = [],
  mentionCandidates = [],
  showTemplateSuggestions = false,
  placeholder = 'พิมพ์ข้อความ… (@ชื่อผู้ใช้ · Enter ส่ง)',
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [draft])

  const mentionCtx = getActiveMentionQuery(draft, cursor)
  const filteredMentions = mentionCtx
    ? mentionCandidates.filter((c) => {
        const q = mentionCtx.query
        return (
          c.login_id.toLowerCase().includes(q) ||
          c.full_name.toLowerCase().includes(q)
        )
      })
    : []

  useEffect(() => {
    setMentionIndex(0)
  }, [mentionCtx?.query])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim() || sending || disabled) return
    void onSubmit()
  }

  function pickMention(candidate: ChatMentionCandidate) {
    if (!mentionCtx || !textareaRef.current) return
    const { next, cursor: nextCursor } = insertMention(
      draft,
      mentionCtx.start,
      textareaRef.current.selectionStart,
      candidate.login_id,
    )
    onDraftChange(next)
    window.requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(nextCursor, nextCursor)
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionCtx && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => (i + 1) % filteredMentions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pickMention(filteredMentions[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!draft.trim() || sending || disabled) return
      void onSubmit()
    }
  }

  return (
    <footer className="chat-composer">
      {showTemplateSuggestions && templates.length > 0 && (
        <div className="chat-composer__suggestions" role="list">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              role="listitem"
              className="chat-composer__chip"
              disabled={disabled || sending}
              title={tpl.body}
              onClick={() => onDraftChange(tpl.body)}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-composer__input-wrap">
        {mentionCtx && filteredMentions.length > 0 && (
          <ul className="chat-mention-picker" role="listbox">
            {filteredMentions.slice(0, 6).map((c, i) => (
              <li key={c.user_id} role="option" aria-selected={i === mentionIndex}>
                <button
                  type="button"
                  className={`chat-mention-picker__item${i === mentionIndex ? ' chat-mention-picker__item--active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pickMention(c)
                  }}
                >
                  <strong>@{c.login_id}</strong>
                  <span className="muted">
                    {c.full_name} · {c.role_hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="chat-composer__form" onSubmit={handleSubmit}>
          <button
            type="button"
            className="chat-composer__icon-btn"
            title="แนบรูป PDF หรือไฟล์เสียง"
            disabled={disabled || sending}
            onClick={onPickFile}
            aria-label="แนบไฟล์"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {onVoiceRecorded && (
            <ChatVoiceRecorder
              disabled={disabled || sending}
              onRecorded={onVoiceRecorded}
              onError={onVoiceError}
            />
          )}

          {onPickVideo && (
            <button
              type="button"
              className="chat-composer__icon-btn"
              title="แนบวิดีโอสั้น"
              disabled={disabled || sending}
              onClick={onPickVideo}
              aria-label="แนบวิดีโอ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect
                  x="3"
                  y="6"
                  width="13"
                  height="12"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <path
                  d="M16 10l5-3v10l-5-3"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}

          <textarea
            ref={textareaRef}
            className="chat-composer__input"
            rows={1}
            placeholder={placeholder}
            value={draft}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              onDraftChange(e.target.value)
              setCursor(e.target.selectionStart ?? e.target.value.length)
            }}
            onClick={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
            onKeyUp={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            aria-label="ข้อความ"
          />

          <button
            type="submit"
            className="chat-composer__send"
            disabled={disabled || sending || !draft.trim()}
            title="ส่งข้อความ"
            aria-label="ส่ง"
          >
            {sending ? (
              <span className="chat-composer__spinner" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </form>
      </div>

      <p className="chat-composer__hint muted">
        Enter ส่ง · @ แท็กทีม · ไมค์บันทึกเสียง · วิดีโอสูงสุด 50 MB
      </p>
    </footer>
  )
}
