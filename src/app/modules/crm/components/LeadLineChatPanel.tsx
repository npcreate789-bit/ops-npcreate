import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isDocumentedLineChatUserExampleId } from '../../../../shared/line/lineDocumentedExampleIds'
import { leadHasLinePushCapability } from '../../../../shared/line/linePushEligibility'
import {
  lineLoginAndOaIdsMismatch,
} from '../../../../shared/line/lineUserIdResolution'
import { getLineReplyWindowStatus } from '../../../../shared/line/lineMessageDisplay'
import type { LineStaffSticker } from '../../../../shared/line/lineStickers'
import { updateLead } from '../api/leads'
import { validateLineChatImage } from '../api/leadLineChat'
import { markLeadLineMessageNotificationReadByLeadId } from '../../notifications/api/notifications'
import { playLineMessageNotificationSound } from '../../notifications/notificationSound'
import {
  clearActiveLeadLineChatFocus,
  setActiveLeadLineChatFocus,
} from '../activeLeadLineChatFocus'
import { insertTextAtComposerCursor } from '../lineChatComposerUtils'
import { enrichLeadLineMessages } from '../leadLineChatUtils'
import { useLeadLineChat } from '../hooks/useLeadLineChat'
import { LeadLineChatComposer } from './LeadLineChatComposer'
import { LeadLineChatMessageItem } from './LeadLineChatMessageItem'
import { LeadLineSnippetPickerModal } from './LeadLineSnippetPickerModal'
import type { Lead } from '../types'
import type { LeadLineMessage } from '../types/leadLineChat'
import type { ServicePackageOption } from '../../../../shared/packages/serviceInterests'
import '../crm.css'

interface LeadLineChatPanelProps {
  lead: Lead
  senderProfileId: string | undefined
  /** ผู้ใช้ที่เปิดแชท — รับทราบแจ้งเตือน LINE เมื่อมีข้อความเข้าใหม่ */
  viewerUserId?: string
  readOnly?: boolean
  servicesInterested?: string[]
  serviceOptions?: ServicePackageOption[]
  canManageSnippets?: boolean
  /** โฟกัสช่องพิมพ์เมื่อเปิดจาก toast แจ้งเตือน LINE */
  focusComposerOnMount?: boolean
  onLeadUpdated?: (lead: Lead) => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatWindowExpiry(date: Date): string {
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isThreadNearBottom(thread: HTMLElement, threshold = 96): boolean {
  return thread.scrollHeight - thread.scrollTop - thread.clientHeight <= threshold
}

export function LeadLineChatPanel({
  lead,
  senderProfileId,
  viewerUserId,
  readOnly = false,
  servicesInterested = [],
  serviceOptions = [],
  canManageSnippets = false,
  focusComposerOnMount = false,
  onLeadUpdated,
}: LeadLineChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<LeadLineMessage | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [selectedSticker, setSelectedSticker] = useState<LineStaffSticker | null>(null)
  const [attachError, setAttachError] = useState<string | null>(null)
  const [snippetModalOpen, setSnippetModalOpen] = useState(false)
  const [syncingOaId, setSyncingOaId] = useState(false)

  const chatSectionRef = useRef<HTMLElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const composerInputRef = useRef<HTMLTextAreaElement>(null)
  const prevMessageCountRef = useRef(0)
  const shouldStickThreadRef = useRef(true)
  const lastInboundKeyRef = useRef('')

  const lineIds = {
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  }
  const idMismatch = lineLoginAndOaIdsMismatch(lineIds)
  const onlyLoginId = Boolean(lineIds.line_user_id?.trim()) && !lineIds.line_oa_chat_user_id?.trim()

  const { messages, loading, sending, deletingId, error, send, remove } = useLeadLineChat(
    lead,
    senderProfileId,
  )
  const messageViews = useMemo(() => enrichLeadLineMessages(messages), [messages])
  const replyWindow = getLineReplyWindowStatus(messages)

  const hasInbound = messages.some((m) => m.direction === 'inbound')
  const hasOutbound = messages.some((m) => m.direction === 'outbound')
  const latestInbound = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((m) => m.direction === 'inbound' && !m.deleted_at) ?? null,
    [messages],
  )
  const savedOaLegacyDocExample = isDocumentedLineChatUserExampleId(lineIds.line_oa_chat_user_id)
  const latestInboundLineUserId = latestInbound?.line_user_id?.trim() ?? ''
  const canPush = leadHasLinePushCapability(lineIds, latestInboundLineUserId)
  const lineChatLinked =
    hasInbound &&
    (hasOutbound || Boolean(lineIds.line_oa_chat_user_id?.trim()) || canPush)
  const savedOaLineUserId = lineIds.line_oa_chat_user_id?.trim() ?? ''
  const savedOaDiffersFromInbound =
    Boolean(latestInboundLineUserId) &&
    Boolean(savedOaLineUserId) &&
    latestInboundLineUserId.toLowerCase() !== savedOaLineUserId.toLowerCase()

  const showSetupBanner = !canPush && !hasInbound
  const showIdSetupHint =
    canPush && !lineChatLinked && (onlyLoginId || idMismatch) && !hasOutbound
  const showOutsideWindow =
    canPush && lineChatLinked && !replyWindow.withinWindow && replyWindow.expiresAt
  const outsideReplyWindow = Boolean(
    hasInbound && replyWindow.expiresAt && !replyWindow.withinWindow,
  )

  const scrollThreadToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior })
  }, [])

  const scrollToMessage = useCallback((messageId: string) => {
    const thread = threadRef.current
    if (!thread) return
    const el = thread.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
    if (!el) return
    const top = el.offsetTop - thread.clientHeight / 3
    thread.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    el.classList.add('crm-line-chat__msg--highlight')
    window.setTimeout(() => el.classList.remove('crm-line-chat__msg--highlight'), 1400)
  }, [])

  useEffect(() => {
    setActiveLeadLineChatFocus(lead.id)
    return () => clearActiveLeadLineChatFocus()
  }, [lead.id])

  useEffect(() => {
    if (!focusComposerOnMount || readOnly || !canPush) return
    const timer = window.setTimeout(() => {
      chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      composerInputRef.current?.focus({ preventScroll: true })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [focusComposerOnMount, readOnly, canPush])

  useEffect(() => {
    const inbound = messages.filter((m) => m.direction === 'inbound' && !m.deleted_at)
    const latest = inbound.at(-1)
    const key = latest ? `${latest.id}:${latest.created_at}` : ''
    if (lastInboundKeyRef.current && key && key !== lastInboundKeyRef.current) {
      playLineMessageNotificationSound()
      if (viewerUserId) {
        void markLeadLineMessageNotificationReadByLeadId(viewerUserId, lead.id).catch(() => {})
      }
    }
    lastInboundKeyRef.current = key
  }, [messages, lead.id, viewerUserId])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread || loading) return

    const prevCount = prevMessageCountRef.current
    const grew = messages.length > prevCount
    prevMessageCountRef.current = messages.length

    if (!grew) return

    if (prevCount === 0 || shouldStickThreadRef.current || isThreadNearBottom(thread)) {
      requestAnimationFrame(() => scrollThreadToBottom(prevCount === 0 ? 'auto' : 'smooth'))
    }
  }, [messages, loading, scrollThreadToBottom])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return

    const onScroll = () => {
      shouldStickThreadRef.current = isThreadNearBottom(thread)
    }

    thread.addEventListener('scroll', onScroll, { passive: true })
    return () => thread.removeEventListener('scroll', onScroll)
  }, [])

  function clearComposer() {
    setDraft('')
    setReplyTo(null)
    setImageFile(null)
    setSelectedSticker(null)
    setAttachError(null)
  }

  function handleImagePick(file: File | null) {
    if (!file) {
      setImageFile(null)
      setAttachError(null)
      return
    }
    const invalid = validateLineChatImage(file)
    if (invalid) {
      setAttachError(invalid)
      setImageFile(null)
      return
    }
    setAttachError(null)
    setImageFile(file)
    if (file) setSelectedSticker(null)
  }

  function handleStickerPick(sticker: LineStaffSticker | null) {
    setSelectedSticker(sticker)
    if (sticker) {
      setImageFile(null)
      setAttachError(null)
    }
  }

  async function handleDelete(messageId: string) {
    if (
      !window.confirm(
        'ลบข้อความนี้จากประวัติแชทในระบบ?\n(ข้อความในแอป LINE ของลูกค้ายังอยู่)',
      )
    ) {
      return
    }
    try {
      await remove(messageId)
    } catch {
      composerInputRef.current?.focus({ preventScroll: true })
    }
  }

  function insertSnippet(text: string) {
    const el = composerInputRef.current
    if (el) {
      setDraft(insertTextAtComposerCursor(el, draft, text))
    } else {
      setDraft(text)
    }
    setReplyTo(null)
    setImageFile(null)
    setSelectedSticker(null)
    setAttachError(null)
    requestAnimationFrame(() => {
      composerInputRef.current?.focus({ preventScroll: true })
    })
  }

  async function handleSyncOaIdFromInbound() {
    if (!latestInboundLineUserId || readOnly) return
    setSyncingOaId(true)
    try {
      const updated = await updateLead(lead.id, {
        line_oa_chat_user_id: latestInboundLineUserId,
      })
      onLeadUpdated?.(updated)
    } catch (e) {
      setAttachError(e instanceof Error ? e.message : 'บันทึก ID ไม่สำเร็จ')
    } finally {
      setSyncingOaId(false)
    }
  }

  async function handleSend() {
    const text = draft.trim()
    if ((!text && !imageFile && !selectedSticker) || readOnly || outsideReplyWindow) return

    shouldStickThreadRef.current = true

    try {
      await send({
        text: text || undefined,
        imageFile: imageFile ?? undefined,
        sticker: selectedSticker,
        replyTo,
      })
      clearComposer()
      requestAnimationFrame(() => {
        scrollThreadToBottom('smooth')
        composerInputRef.current?.focus({ preventScroll: true })
      })
    } catch {
      composerInputRef.current?.focus({ preventScroll: true })
    }
  }

  const displayError = attachError ?? error

  return (
    <section
      ref={chatSectionRef}
      className="card card--wide crm-line-chat"
      aria-label="แชท LINE"
    >
      <header className="crm-line-chat__head">
        <div className="crm-line-chat__title-row">
          <span className="crm-line-chat__line-badge" aria-hidden>
            LINE
          </span>
          <div>
            <h2>แชทกับลูกค้า</h2>
            <p className="crm-line-chat__subtitle">
              {lineChatLinked
                ? 'ส่งและรับข้อความผ่าน Official Account'
                : 'เชื่อมต่อเมื่อลูกค้าทัก OA หรือบันทึก ID จาก chat.line.biz'}
            </p>
          </div>
        </div>
      </header>

      <div className="crm-line-chat__status-row" role="status">
        {lineChatLinked ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--ok">เชื่อมต่อแล้ว</span>
        ) : canPush ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--muted">รอข้อความจากลูกค้า</span>
        ) : null}
        {canPush && replyWindow.withinWindow && replyWindow.expiresAt ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--window">
            Push ได้ถึง {formatWindowExpiry(replyWindow.expiresAt)}
          </span>
        ) : null}
        {showOutsideWindow && replyWindow.expiresAt ? (
          <span className="crm-line-chat__pill crm-line-chat__pill--warn">
            นอกช่วง 24 ชม. — ให้ลูกค้าทักใหม่
          </span>
        ) : null}
      </div>

      {showSetupBanner ? (
        <div className="crm-line-chat__notice crm-line-chat__notice--warn">
          <p>ยังส่งจากระบบไม่ได้ — บันทึก LINE User ID จาก URL แชท OA ในส่วนด้านบน</p>
        </div>
      ) : null}

      {showIdSetupHint ? (
        <div className="crm-line-chat__notice crm-line-chat__notice--info">
          <p>
            {idMismatch
              ? 'มี ID จากฟอร์มติดต่อกับแชท OA คนละตัว — ให้ลูกค้าทัก OA หนึ่งครั้ง หรือบันทึก ID จาก chat.line.biz'
              : 'มีเฉพาะ ID จากฟอร์ม — ถ้าส่งไม่ผ่าน ให้บันทึก ID จาก chat.line.biz'}
          </p>
        </div>
      ) : null}

      {(savedOaLegacyDocExample || savedOaDiffersFromInbound) && latestInboundLineUserId ? (
        <div className="crm-line-chat__notice crm-line-chat__notice--warn" role="alert">
          <p>
            {savedOaLegacyDocExample
              ? 'ID แชท OA ตรงตัวอย่างในคู่มือเก่า — ถ้าคัดลอกจากเอกสารให้ใช้ปุ่มด้านล่าง หรือเปิดแชทลูกค้าจริงบน chat.line.biz — '
              : 'ID ที่บันทึกไม่ตรงข้อความลูกค้า — '}
            กดปุ่มด้านล่างเพื่อใช้ ID จากข้อความที่ลูกค้าทักเข้ามา (หรือวางลิงก์จาก chat.line.biz
            ในส่วนบันทึก ID ด้านบน)
          </p>
          {!readOnly ? (
            <button
              type="button"
              className="crm-btn crm-btn--primary crm-line-chat__sync-oa-btn"
              disabled={syncingOaId}
              onClick={() => void handleSyncOaIdFromInbound()}
            >
              {syncingOaId ? 'กำลังบันทึก…' : 'ใช้ ID จากข้อความลูกค้า'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={threadRef} className="crm-line-chat__thread" aria-live="polite">
        {loading && messages.length === 0 ? (
          <p className="crm-line-chat__empty">กำลังโหลดข้อความ…</p>
        ) : messages.length === 0 ? (
          <p className="crm-line-chat__empty">
            ยังไม่มีข้อความ — ข้อความจากลูกค้าจะแสดงที่นี่หลังทัก OA
          </p>
        ) : (
          <ul className="crm-line-chat__messages">
            {messageViews.map((m) => (
              <LeadLineChatMessageItem
                key={m.id}
                message={m}
                formattedTime={formatTime(m.created_at)}
                canReply={!readOnly && canPush && !outsideReplyWindow}
                canDelete={!readOnly && m.direction === 'outbound'}
                deleting={deletingId === m.id}
                onReply={(msg) => {
                  setReplyTo(msg)
                  requestAnimationFrame(() => {
                    composerInputRef.current?.focus({ preventScroll: true })
                  })
                }}
                onDelete={(msg) => void handleDelete(msg.id)}
                onJumpToReply={scrollToMessage}
              />
            ))}
          </ul>
        )}
        {sending ? (
          <p className="crm-line-chat__thread-status" aria-live="polite">
            กำลังส่ง…
          </p>
        ) : null}
      </div>

      {displayError ? (
        <p className="crm-line-chat__error" role="alert">
          {displayError}
        </p>
      ) : null}

      {canPush ? (
        <div className="crm-line-chat__footer">
          {!readOnly ? (
            <LeadLineChatComposer
              inputRef={composerInputRef}
              disabled={false}
              sending={sending}
              outsideReplyWindow={outsideReplyWindow}
              draft={draft}
              onDraftChange={setDraft}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              imageFile={imageFile}
              imagePreviewUrl={imagePreviewUrl}
              onImagePick={handleImagePick}
              selectedSticker={selectedSticker}
              onStickerPick={handleStickerPick}
              onOpenSnippets={() => setSnippetModalOpen(true)}
              onSubmit={handleSend}
            />
          ) : null}
        </div>
      ) : null}

      <LeadLineSnippetPickerModal
        open={snippetModalOpen}
        lead={lead}
        servicesInterested={servicesInterested}
        serviceOptions={serviceOptions}
        canManage={canManageSnippets && !readOnly}
        onClose={() => setSnippetModalOpen(false)}
        onSelect={insertSnippet}
      />
    </section>
  )
}
