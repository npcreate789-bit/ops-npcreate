import { useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { createTask } from '../../tasks/api/tasks'
import { insertChatSystemMessage, linkChatMessageToTask } from '../api/chat'
import { validateChatFile } from '../api/chatFiles'
import { ChatMessageBubble } from './ChatMessageBubble'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { messages, loading, sending, error, bottomRef, send, sendFile, reload, roomId } =
    useProjectChat(projectId, userId)

  async function submitMessage() {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    await send(text)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void submitMessage()
  }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submitMessage()
    }
  }

  function handlePickFile() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const validation = validateChatFile(file)
    if (validation) {
      alert(validation)
      return
    }
    const caption = draft.trim() || undefined
    if (caption) setDraft('')
    await sendFile(file, caption)
  }

  async function handleCreateTask(message: ChatMessage) {
    if (!canCreateTask || message.created_task_id || !roomId) return
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
      await insertChatSystemMessage(
        roomId,
        `สร้างงานจากข้อความแชท: ${task.title}`,
        task.id,
      )
      await reload()
    } catch {
      /* error surfaced on next reload */
    } finally {
      setCreatingFromId(null)
    }
  }

  return (
    <section className="card card--wide project-chat">
      <header className="project-chat__head">
        <h2>แชทโปรเจกต์</h2>
        <p className="muted">
          {projectName} — Enter ส่ง · แนบรูป/PDF ได้
        </p>
      </header>

      {loading && <p className="muted">กำลังโหลดข้อความ...</p>}
      {error && <p className="crm-error">{error}</p>}

      <div className="project-chat__feed" role="log" aria-live="polite">
        {!loading && messages.length === 0 && (
          <p className="muted project-chat__empty">ยังไม่มีข้อความ — ส่งข้อความแรกได้เลย</p>
        )}
        {messages.map((m) => (
          <ChatMessageBubble
            key={m.id}
            message={m}
            mine={m.sender_id === userId}
            canCreateTask={canCreateTask}
            creatingTask={creatingFromId === m.id}
            onCreateTask={() => void handleCreateTask(m)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="project-chat__composer" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="project-chat__file-input"
          hidden
          onChange={(e) => void handleFileChange(e)}
        />
        <textarea
          className="crm-input project-chat__input"
          rows={2}
          placeholder="พิมพ์ข้อความ..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleComposerKeyDown}
          disabled={loading || sending}
        />
        <div className="project-chat__composer-actions">
          <button
            type="button"
            className="crm-btn crm-btn--ghost"
            disabled={loading || sending}
            onClick={handlePickFile}
          >
            แนบไฟล์
          </button>
          <button
            type="submit"
            className="crm-btn crm-btn--primary"
            disabled={loading || sending || !draft.trim()}
          >
            {sending ? 'กำลังส่ง...' : 'ส่ง'}
          </button>
        </div>
      </form>
    </section>
  )
}
