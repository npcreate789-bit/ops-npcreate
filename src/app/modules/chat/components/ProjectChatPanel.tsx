import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../../../shared/auth/AuthProvider'
import { hasTasksTeamView } from '../../../../shared/auth/access'
import { createTask } from '../../tasks/api/tasks'
import { insertChatSystemMessage, linkChatMessageToTask, listProjectChatChannels } from '../api/chat'
import { CHAT_CHANNEL_HINTS, parseChatChannel, type ChatChannelKey } from '../constants/channels'
import { CHAT_FILE_ACCEPT, CHAT_VIDEO_ACCEPT, validateChatFile } from '../api/chatFiles'
import {
  fetchChatRoomSocial,
  listChatMentionCandidates,
  listChatMessageTemplates,
  deleteChatMessageNote,
  pinChatMessage,
  saveChatMessageNote,
  toggleChatReaction,
  unpinChatMessage,
} from '../api/chatSocial'
import { messageMatchesSearch } from '../utils/chatDisplay'
import type {
  ChatMessage,
  ChatMessageTemplate,
  ChatMentionCandidate,
  ChatReactionEmoji,
  ChatReplyTarget,
} from '../types'
import { messageToReplyTarget } from '../utils/replyPreview'
import { scrollChatFeedToBottom } from '../utils/chatScroll'
import { ChatChannelTabs } from './ChatChannelTabs'
import { ChatComposer } from './ChatComposer'
import { ChatReplyBar } from './ChatReplyBar'
import { ChatMessageList } from './ChatMessageList'
import { ChatPinnedBar } from './ChatPinnedBar'
import { ChatNotesPopover } from './ChatNotesPopover'
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
  channel?: ChatChannelKey
  onChannelChange?: (channel: ChatChannelKey) => void
  lockedChannel?: ChatChannelKey
}

export function ProjectChatPanel({
  projectId,
  projectName,
  customerId,
  brandName,
  userId = DEV_OWNER,
  canCreateTask: canCreateTaskProp,
  variant = 'shell',
  channel: channelProp,
  onChannelChange,
  lockedChannel,
}: ProjectChatPanelProps) {
  const { profile, configured } = useAuth()
  const roles = profile?.roles ?? []
  const canCreateTask = canCreateTaskProp ?? (hasTasksTeamView(roles) || !configured)
  const isClientOnly = roles.length > 0 && roles.every((r) => r === 'client')
  const activeChannel = parseChatChannel(lockedChannel ?? channelProp ?? 'client')

  const [channelTabs, setChannelTabs] = useState<{ channel: ChatChannelKey; label: string }[]>([])
  const [draft, setDraft] = useState('')
  const [replyTarget, setReplyTarget] = useState<ChatReplyTarget | null>(null)
  const [openNotesMessageId, setOpenNotesMessageId] = useState<string | null>(null)
  const [openNotesAnchor, setOpenNotesAnchor] = useState<HTMLElement | null>(null)
  const [notesSaving, setNotesSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [creatingFromId, setCreatingFromId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<ChatMessageTemplate[]>([])
  const [mentionCandidates, setMentionCandidates] = useState<ChatMentionCandidate[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const { messages, loading, sending, error, bottomRef, send, sendFile, reload, roomId } =
    useProjectChat(projectId, userId, activeChannel)

  const { social, reload: reloadSocial, setSocial } = useChatRoomSocial(roomId, messages.length)

  useEffect(() => {
    if (lockedChannel) {
      setChannelTabs([])
      return
    }
    listProjectChatChannels(projectId)
      .then((rows) =>
        setChannelTabs(rows.map((r) => ({ channel: r.channel, label: r.label }))),
      )
      .catch(() => setChannelTabs([]))
  }, [projectId, lockedChannel])

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

  useEffect(() => {
    setReplyTarget(null)
    setOpenNotesMessageId(null)
    setOpenNotesAnchor(null)
  }, [projectId, activeChannel])

  const notesTarget = useMemo(
    () => (openNotesMessageId ? messages.find((m) => m.id === openNotesMessageId) : undefined),
    [messages, openNotesMessageId],
  )

  useEffect(() => {
    if (openNotesMessageId && !notesTarget) {
      setOpenNotesMessageId(null)
      setOpenNotesAnchor(null)
    }
  }, [openNotesMessageId, notesTarget])

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
    const replyToId = replyTarget?.id ?? null
    setDraft('')
    setReplyTarget(null)
    await send(text, replyToId)
    await reloadSocial()
  }

  function startReply(message: ChatMessage) {
    if (message.message_type === 'system') return
    setReplyTarget(messageToReplyTarget(message))
    document.querySelector<HTMLTextAreaElement>('.chat-composer__input')?.focus()
  }

  function toggleNotes(messageId: string, anchor: HTMLElement) {
    if (openNotesMessageId === messageId) {
      setOpenNotesMessageId(null)
      setOpenNotesAnchor(null)
      return
    }
    setOpenNotesMessageId(messageId)
    setOpenNotesAnchor(anchor)
  }

  function closeNotes() {
    setOpenNotesMessageId(null)
    setOpenNotesAnchor(null)
  }

  async function handleSaveNote(messageId: string, body: string) {
    setNotesSaving(true)
    try {
      const row = await saveChatMessageNote(messageId, body)
      setSocial((prev) => {
        const list = prev.notes[messageId] ?? []
        return {
          ...prev,
          notes: {
            ...prev.notes,
            [messageId]: [...list, row],
          },
        }
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'บันทึกโน้ตไม่สำเร็จ')
    } finally {
      setNotesSaving(false)
    }
  }

  async function handleDeleteNote(messageId: string, noteId: string) {
    setNotesSaving(true)
    try {
      await deleteChatMessageNote(noteId, messageId)
      setSocial((prev) => ({
        ...prev,
        notes: {
          ...prev.notes,
          [messageId]: (prev.notes[messageId] ?? []).filter((n) => n.id !== noteId),
        },
      }))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ลบโน้ตไม่สำเร็จ')
    } finally {
      setNotesSaving(false)
    }
  }

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`chat-msg-${messageId}`)
    const feed = el?.closest('.chat-feed')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (feed instanceof HTMLElement) {
      scrollChatFeedToBottom(feed, 'smooth')
    }
  }

  function handlePickFile() {
    fileInputRef.current?.click()
  }

  function handlePickVideo() {
    videoInputRef.current?.click()
  }

  async function handleVoiceRecorded(file: File) {
    const replyToId = replyTarget?.id ?? null
    setReplyTarget(null)
    await sendFile(file, undefined, replyToId)
    await reloadSocial()
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
    const replyToId = replyTarget?.id ?? null
    if (caption) setDraft('')
    setReplyTarget(null)
    await sendFile(file, caption, replyToId)
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
      {!lockedChannel && (
        <ChatChannelTabs
          channels={channelTabs}
          active={activeChannel}
          disabled={loading}
          onChange={(ch) => onChannelChange?.(ch)}
        />
      )}

      <ChatRoomHeader
        title={projectName}
        subtitle={
          lockedChannel
            ? brandName
              ? `แบรนด์ ${brandName} · แชทกับทีม`
              : 'แชทกับทีม'
            : brandName
              ? `แบรนด์ ${brandName} · ${CHAT_CHANNEL_HINTS[activeChannel]}`
              : CHAT_CHANNEL_HINTS[activeChannel]
        }
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

      {openNotesMessageId && notesTarget && openNotesAnchor && (
        <ChatNotesPopover
          message={notesTarget}
          userId={userId}
          notes={social.notes[notesTarget.id] ?? []}
          saving={notesSaving}
          anchorEl={openNotesAnchor}
          onSave={(body) => handleSaveNote(notesTarget.id, body)}
          onDelete={(noteId) => handleDeleteNote(notesTarget.id, noteId)}
          onClose={closeNotes}
        />
      )}

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
        onReply={startReply}
        onJumpToMessage={scrollToMessage}
        notes={social.notes}
        openNotesMessageId={openNotesMessageId}
        onToggleNotes={toggleNotes}
      />

      {replyTarget && (
        <ChatReplyBar
          target={replyTarget}
          userId={userId}
          onCancel={() => setReplyTarget(null)}
          onJump={() => scrollToMessage(replyTarget.id)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={CHAT_FILE_ACCEPT}
        className="visually-hidden"
        onChange={(e) => void handleFileChange(e)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={CHAT_VIDEO_ACCEPT}
        className="visually-hidden"
        onChange={(e) => void handleFileChange(e)}
      />

      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={submitMessage}
        onPickFile={handlePickFile}
        onPickVideo={handlePickVideo}
        onVoiceRecorded={handleVoiceRecorded}
        onVoiceError={(msg) => alert(msg)}
        sending={sending}
        disabled={loading}
        templates={templates}
        mentionCandidates={mentionCandidates}
        showTemplateSuggestions={showTemplateSuggestions}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
      />
    </section>
  )
}
