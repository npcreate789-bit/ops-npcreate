import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatBangkokDateTime } from '../../../../shared/dates/bangkok'
import { createTask } from '../../tasks/api/tasks'
import { linkChatMessageToTask } from '../api/chat'
import { useProjectChat } from '../hooks/useProjectChat'
import type { ChatMessage } from '../types'
import '../chat.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

interface ProjectChatPanelProps {
  projectId: string
  projectName: string
  customerId: string
  userId?: string
  canCreateTask?: boolean
}

export function ProjectChatPanel({
  projectId,
  projectName,
  customerId,
  userId = DEV_OWNER,
  canCreateTask = true,
}: ProjectChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [creatingFromId, setCreatingFromId] = useState<string | null>(null)
  const { messages, loading, sending, error, bottomRef, send, reload } = useProjectChat(
    projectId,
    userId,
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    await send(text)
  }

  async function handleCreateTask(message: ChatMessage) {
    if (!canCreateTask || message.created_task_id) return
    setCreatingFromId(message.id)
    try {
      const task = await createTask({
        title: `จากแชท: ${message.body.slice(0, 80)}`,
        description: message.body,
        status: 'todo',
        priority: 'medium',
        assignee_id: userId,
        created_by: userId,
        customer_id: customerId,
        project_id: projectId,
        lead_id: null,
        due_at: null,
      })
      await linkChatMessageToTask(message.id, task.id)
      await reload()
    } catch {
      /* shown via parent reload if needed */
    } finally {
      setCreatingFromId(null)
    }
  }

  return (
    <section className="card card--wide project-chat">
      <header className="project-chat__head">
        <h2>แชทโปรเจกต์</h2>
        <p className="muted">{projectName}</p>
      </header>

      {loading && <p className="muted">กำลังโหลดข้อความ...</p>}
      {error && <p className="crm-error">{error}</p>}

      <div className="project-chat__feed" role="log" aria-live="polite">
        {!loading && messages.length === 0 && (
          <p className="muted project-chat__empty">ยังไม่มีข้อความ — ส่งข้อความแรกได้เลย</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId
          return (
            <article
              key={m.id}
              className={`project-chat__msg${mine ? ' project-chat__msg--mine' : ''}`}
            >
              <div className="project-chat__meta">
                <strong>{mine ? 'คุณ' : m.sender_name ?? 'ทีมงาน'}</strong>
                <time dateTime={m.created_at}>{formatBangkokDateTime(m.created_at)}</time>
              </div>
              <p className="project-chat__body">{m.body}</p>
              {m.created_task_id ? (
                <Link to={`/app/tasks/${m.created_task_id}`} className="project-chat__task-link">
                  ดูงานที่สร้างแล้ว
                </Link>
              ) : canCreateTask && !mine ? (
                <button
                  type="button"
                  className="crm-btn crm-btn--ghost crm-btn--sm"
                  disabled={creatingFromId === m.id}
                  onClick={() => void handleCreateTask(m)}
                >
                  {creatingFromId === m.id ? 'กำลังสร้างงาน...' : 'สร้าง Task'}
                </button>
              ) : null}
            </article>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form className="project-chat__composer" onSubmit={handleSubmit}>
        <textarea
          className="crm-input project-chat__input"
          rows={2}
          placeholder="พิมพ์ข้อความ..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={loading || sending}
        />
        <button type="submit" className="crm-btn crm-btn--primary" disabled={loading || sending || !draft.trim()}>
          {sending ? 'กำลังส่ง...' : 'ส่ง'}
        </button>
      </form>
    </section>
  )
}
