import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
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
import { ChatRoomTopBar } from './ChatRoomTopBar'
import { ChatComposer } from './ChatComposer'
import { ChatReplyBar } from './ChatReplyBar'
import { ChatMessageList } from './ChatMessageList'
import { ChatPinnedBar } from './ChatPinnedBar'
import { ChatNotesPopover } from './ChatNotesPopover'
import { ChatRoomHeader } from './ChatRoomHeader'
import { useChatRoomSocial } from '../hooks/useChatRoomSocial'
import { useCustomerLineActivity } from '../hooks/useCustomerLineActivity'
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
  /**
   * เมื่อตั้งค่า — จะส่งต่อให้ ChatRoomHeader แสดงปุ่ม "กลับ"
   * (ใช้กับเลย์เอาต์ list-or-room บนจอแคบ)
   */
  onBack?: () => void
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
  onBack,
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
  const [notesPanelOpen, setNotesPanelOpen] = useState(false)
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

  /*
   * ลูกค้ายังคุยทาง LINE OA ต่อได้แม้หลังปิดการขาย — ตรวจ activity ของ lead
   * ต้นทาง เพื่อแจ้งทีมโปรเจกต์ว่ามีข้อความเข้าใหม่ (กัน miss แชทเพราะทีม
   * สลับมาทำ Project Chat แทน CRM)
   * Client-only เท่านั้นที่ไม่ต้องโชว์ (พวกเขาส่งข้อความตรงในห้องลูกค้าได้อยู่แล้ว)
   */
  const lineActivity = useCustomerLineActivity(isClientOnly ? null : customerId)
  const lineLastInboundText = useMemo(() => {
    if (!lineActivity.latestInboundAt) return null
    const now = Date.now()
    const ts = new Date(lineActivity.latestInboundAt).getTime()
    if (!Number.isFinite(ts)) return null
    const diffMin = Math.max(0, Math.round((now - ts) / 60000))
    if (diffMin < 1) return 'เมื่อสักครู่'
    if (diffMin < 60) return `เมื่อ ${diffMin} นาทีที่แล้ว`
    const diffHr = Math.round(diffMin / 60)
    if (diffHr < 24) return `เมื่อ ${diffHr} ชม. ที่แล้ว`
    const diffDay = Math.round(diffHr / 24)
    return `เมื่อ ${diffDay} วันที่แล้ว`
  }, [lineActivity.latestInboundAt])

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
    setNotesPanelOpen(false)
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
    setNotesPanelOpen(true)
  }

  function openNotedFromTopBar(messageId: string, anchor: HTMLElement) {
    if (searchQuery.trim()) {
      setSearchQuery('')
    }
    setOpenNotesMessageId(messageId)
    setOpenNotesAnchor(anchor)
    setNotesPanelOpen(true)
    window.setTimeout(() => scrollToMessage(messageId), 0)
  }

  function closeNotes() {
    setOpenNotesMessageId(null)
    setOpenNotesAnchor(null)
  }

  function closeNotesUi() {
    closeNotes()
    setNotesPanelOpen(false)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (openNotesMessageId || notesPanelOpen) {
        closeNotesUi()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openNotesMessageId, notesPanelOpen])

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
      setSocial((prev) => {
        const next = (prev.notes[messageId] ?? []).filter((n) => n.id !== noteId)
        const notes = { ...prev.notes }
        if (next.length === 0) {
          delete notes[messageId]
        } else {
          notes[messageId] = next
        }
        return { ...prev, notes }
      })
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
        onBack={onBack}
      />

      <ChatRoomTopBar
        channels={
          lockedChannel
            ? [{ channel: lockedChannel, label: CHAT_CHANNEL_HINTS[lockedChannel] }]
            : channelTabs.length > 0
              ? channelTabs
              : [{ channel: activeChannel, label: CHAT_CHANNEL_HINTS[activeChannel] }]
        }
        activeChannel={activeChannel}
        onChannelChange={(ch) => onChannelChange?.(ch)}
        channelTabsDisabled={loading}
        showChannelTabs
        messages={messages}
        notesMap={social.notes}
        userId={userId}
        notesPanelOpen={notesPanelOpen}
        onToggleNotesPanel={() => setNotesPanelOpen((v) => !v)}
        onOpenNotedMessage={openNotedFromTopBar}
        activeNotedMessageId={openNotesMessageId}
      />

      {/*
        Phase 2E fallback — ลูกค้ามี Lead ต้นทาง แต่ "ไม่มี" LINE OA / LINE ID
        → ทีมต้องรู้ว่าระบบจะส่งข้อความ handoff / project-status อัตโนมัติไม่ได้
        และต้องสื่อสารผ่านช่องทางอื่น (โทร / Facebook / อีเมล)
      */}
      {!isClientOnly &&
        lineActivity.loaded &&
        lineActivity.leadId &&
        !lineActivity.hasLineEvidence && (
          <div className="chat-line-awareness chat-line-awareness--fallback" role="status">
            <div className="chat-line-awareness__row">
              <div className="chat-line-awareness__copy">
                <strong>ลูกค้านี้ไม่มี LINE OA</strong>
                <span>
                  ระบบจะส่งข้อความอัตโนมัติทาง LINE ไม่ได้ — โปรดติดต่อทางโทรศัพท์/Messenger/อีเมล
                  หรือชวนลูกค้าทักหา OA หนึ่งครั้งเพื่อเปิดช่องทาง
                </span>
              </div>
              <Link
                to={`/app/crm/${lineActivity.leadId}`}
                className="crm-btn crm-btn--ghost crm-btn--sm chat-line-awareness__cta"
              >
                เปิด CRM Lead
              </Link>
            </div>
          </div>
        )}

      {/*
        แบนเนอร์ LINE OA awareness — ขึ้นเฉพาะเมื่อ lead มีร่องรอย LINE จริง
        ๆ lineLastInboundText จะมีค่าก็ต่อเมื่อมี inbound message ในกรอบ 7 วัน
        → ทำให้เด่นเฉพาะตอนที่ทีมต้องสนใจจริง (ไม่ noise ทุก lead)
      */}
      {lineActivity.hasLineEvidence && lineActivity.leadId && (
        <div
          className={`chat-line-awareness${
            lineLastInboundText ? ' chat-line-awareness--active' : ''
          }`}
          role={lineLastInboundText ? 'status' : undefined}
        >
          <div className="chat-line-awareness__row">
            <div className="chat-line-awareness__copy">
              <strong>LINE OA — ลูกค้ายังทักเข้ามาได้</strong>
              {lineLastInboundText ? (
                <span>ลูกค้าทักล่าสุด {lineLastInboundText}</span>
              ) : (
                <span className="muted">ห้องนี้สำหรับทีม — ตอบลูกค้าทาง LINE ที่ CRM</span>
              )}
            </div>
            <Link
              to={`/app/crm/${lineActivity.leadId}`}
              state={{ focusLineChat: true }}
              className="crm-btn crm-btn--ghost crm-btn--sm chat-line-awareness__cta"
            >
              {lineLastInboundText ? 'เปิดแชท LINE OA →' : 'ดูแชท LINE OA'}
            </Link>
          </div>

          {lineActivity.preview.length > 0 && (
            <details className="chat-line-awareness__preview">
              <summary>
                ดูข้อความ LINE OA ล่าสุด ({lineActivity.preview.length})
              </summary>
              <ul className="chat-line-awareness__messages">
                {lineActivity.preview.map((m) => {
                  const previewBody =
                    m.message_type === 'image'
                      ? '🖼 รูปภาพ'
                      : m.message_type === 'sticker'
                        ? '😊 สติกเกอร์'
                        : m.message_type === 'video'
                          ? '🎥 วิดีโอ'
                          : m.message_type === 'audio'
                            ? '🎙 เสียง'
                            : m.message_type === 'file'
                              ? '📎 ไฟล์'
                              : m.body.length > 140
                                ? `${m.body.slice(0, 140)}…`
                                : m.body
                  const timeText = (() => {
                    try {
                      return new Date(m.created_at).toLocaleString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    } catch {
                      return ''
                    }
                  })()
                  return (
                    <li
                      key={m.id}
                      className={`chat-line-awareness__msg chat-line-awareness__msg--${m.direction}`}
                    >
                      <span className="chat-line-awareness__msg-dir">
                        {m.direction === 'inbound' ? 'ลูกค้า' : 'ทีม'}
                      </span>
                      <p className="chat-line-awareness__msg-body">{previewBody}</p>
                      <span className="chat-line-awareness__msg-time">{timeText}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="chat-line-awareness__preview-foot">
                ตอบกลับ LINE OA ได้ที่{' '}
                <Link
                  to={`/app/crm/${lineActivity.leadId}`}
                  state={{ focusLineChat: true }}
                >
                  หน้า CRM Lead
                </Link>
              </p>
            </details>
          )}
        </div>
      )}

      {openNotesMessageId && notesTarget && openNotesAnchor && (
        <ChatNotesPopover
          message={notesTarget}
          userId={userId}
          notes={social.notes[notesTarget.id] ?? []}
          saving={notesSaving}
          anchorEl={openNotesAnchor}
          onSave={(body) => handleSaveNote(notesTarget.id, body)}
          onDelete={(noteId) => handleDeleteNote(notesTarget.id, noteId)}
          onClose={closeNotesUi}
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
