import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import { createTask } from '../../tasks/api/tasks'
import { insertChatSystemMessage, linkChatMessageToTask } from '../api/chat'
import { validateChatFile } from '../api/chatFiles'
import {
  fetchChatRoomSocial,
  listChatMentionCandidates,
  listChatMessageTemplates,
  pinChatMessage,
  toggleChatReaction,
  unpinChatMessage,
} from '../api/chatSocial'
import { messageMatchesSearch } from '../utils/chatDisplay'
import type { ChatMessage, ChatMessageTemplate, ChatMentionCandidate, ChatReactionEmoji } from '../types'
import { ChatComposer } from './ChatComposer'
import { ChatMessageList } from './ChatMessageList'
import { ChatPinnedBar } from './ChatPinnedBar'
import { ChatRoomHeader } from './ChatRoomHeader'
import { useChatRoomSocial } from '../hooks/useChatRoomSocial'
import { useProjectChat } from '../hooks/useProjectChat'
import '../chat.css'

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

interface ProjectChatPanelProps {
  projectId: string
  projectName: string
  customerId: string
  brandName?: string
  userId?: string
  canCreateTask?: boolean
  variant?: 'card' | 'shell'
}

export function ProjectChatPanel({
  projectId,
  projectName,
  customerId,
  brandName,
  userId = DEV_OWNER,
  canCreateTask: canCreateTaskProp,
  variant = 'shell',
}: ProjectChatPanelProps) {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canCreateTask = canCreateTaskProp ?? (hasTasksTeamView(roles) || !configured)
  const isClientOnly = roles.length > 0 && roles.every((r) => r === 'client')

  const [draft, setDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [creatingFromId, setCreatingFromId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ChatMessageTemplate[]>([])
  const [mentionCandidates, setMentionCandidates] = useState<ChatMentionCandidate[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { messages, loading, sending, error, bottomRef, send, sendFile, reload, roomId } =
    useProjectChat(projectId, userId)

  const { social, reload: reloadSocial, setSocial } = useChatRoomSocial(roomId, messages.length)

  useEffect(() => {
    if (isClientOnly) {
      setTemplates([])
      setMentionCandidates([])
      return
    }
    listChatMessageTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
    listChatMentionCandidates(projectId)
      .then(setMentionCandidates)
      .catch(() => setMentionCandidates([]))
  }, [projectId, isClientOnly])

  const visibleMessages = useMemo(
    () => messages.filter((m) => messageMatchesSearch(m, searchQuery)),
    [messages, searchQuery],
  )

  const pinnedIds = useMemo(
    () => new Set(social.pinned.map((p) => p.message_id)),
    [social.pinned],
  )

  const showTemplateSuggestions =
    !loading && messages.length === 0 && !searchQuery.trim() && !isClientOnly

  async function submitMessage() {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    await send(text)
    await reloadSocial()
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
    await reloadSocial()
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
      await reloadSocial()
    } catch {
      /* surfaced on reload */
    } finally {
      setCreatingFromId(null)
    }
  }

  async function handlePin(messageId: string) {
    if (!roomId) return
    await pinChatMessage(roomId, messageId)
    await reloadSocial()
  }

  async function handleUnpin(messageId: string) {
    if (!roomId) return
    await unpinChatMessage(roomId, messageId)
    await reloadSocial()
  }

  async function handleToggleReaction(messageId: string, emoji: ChatReactionEmoji) {
    await toggleChatReaction(messageId, emoji)
    if (!roomId) return
    setSocial(await fetchChatRoomSocial(roomId))
  }

  function jumpToMessage(messageId: string) {
    document.getElementById(`chat-msg-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section
      className={`chat-shell${variant === 'card' ? ' chat-shell--card card card--wide' : ''}`}
    >
      <ChatRoomHeader
        title={projectName}
        subtitle={brandName ? `แบรนด์ ${brandName}` : 'แชทโปรเจกต์'}
        projectId={projectId}
        customerId={customerId}
        brandName={brandName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={() => {
          void reload()
          void reloadSocial()
        }}
        refreshing={loading}
      />

      {error && <p className="crm-error chat-shell__error">{error}</p>}

      <ChatPinnedBar
        pinned={social.pinned}
        onJump={jumpToMessage}
        onUnpin={(id) => void handleUnpin(id)}
      />

      <ChatMessageList
        messages={visibleMessages}
        userId={userId}
        loading={loading}
        canCreateTask={canCreateTask}
        creatingFromId={creatingFromId}
        onCreateTask={handleCreateTask}
        bottomRef={bottomRef}
        searchQuery={searchQuery}
        pinnedIds={pinnedIds}
        readReceipts={social.readReceipts}
        reactions={social.reactions}
        onPin={(id) => void handlePin(id)}
        onUnpin={(id) => void handleUnpin(id)}
        onToggleReaction={(id, emoji) => void handleToggleReaction(id, emoji)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="visually-hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={submitMessage}
        onPickFile={handlePickFile}
        sending={sending}
        disabled={loading}
        templates={templates}
        mentionCandidates={mentionCandidates}
        showTemplateSuggestions={showTemplateSuggestions}
      />
    </section>
  )
}
