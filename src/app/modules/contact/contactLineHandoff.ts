import { appUrl } from '../../../shared/config/appUrl'
import {
  lineOaStarterMessageUrl,
  markLineOaContactPending,
} from '../../../shared/contact/channelConnectConfig'
import { openLineUrlInPlace } from '../../../shared/contact/lineInPlaceOpen'
import { isMobileBrowser } from '../../../shared/line/lineStaffOpenUrl'

const PENDING_MESSAGE_KEY = 'npc_contact_handoff_line_message'
const PENDING_CHAT_URL_KEY = 'npc_contact_handoff_chat_url'
const PENDING_PUSHED_KEY = 'npc_contact_handoff_pushed'
const PENDING_FAIL_REASON_KEY = 'npc_contact_handoff_fail_reason'
const PENDING_SUCCESS_UI_KEY = 'npc_contact_handoff_success_ui'

export function buildContactLineInquiryMessage(input: {
  contactName: string
  phone: string
  serviceLabels: string[]
}): string {
  const lines = ['สนใจบริการ NP Create', `ชื่อ: ${input.contactName.trim()}`, `โทร: ${input.phone.trim()}`]
  if (input.serviceLabels.length > 0) {
    lines.push(`บริการที่สนใจ: ${input.serviceLabels.join(', ')}`)
  }
  return lines.join('\n')
}

export function contactCrmLeadUrl(leadId: string): string {
  return appUrl(`/app/crm/leads/${leadId}`)
}

/** ข้อความในช่องพิมพ์เมื่อเปิด LINE (oaMessage) */
export function buildContactLineOaPrefillMessage(leadId: string): string {
  return `CRM:${contactCrmLeadUrl(leadId)}`
}

export function persistContactLineHandoffState(input: {
  message: string
  chatUrl: string
  pushedToChat: boolean
  failReason?: string
}): boolean {
  const trimmed = input.message.trim()
  if (!trimmed) return false
  try {
    sessionStorage.setItem(PENDING_MESSAGE_KEY, trimmed)
    sessionStorage.setItem(PENDING_CHAT_URL_KEY, input.chatUrl)
    sessionStorage.setItem(PENDING_PUSHED_KEY, input.pushedToChat ? '1' : '0')
    if (input.failReason) {
      sessionStorage.setItem(PENDING_FAIL_REASON_KEY, input.failReason)
    } else {
      sessionStorage.removeItem(PENDING_FAIL_REASON_KEY)
    }
  } catch {
    return false
  }
  return true
}

export function readContactLineHandoffFailReason(): string | null {
  try {
    return sessionStorage.getItem(PENDING_FAIL_REASON_KEY)
  } catch {
    return null
  }
}

export function readContactLineHandoffMessage(): string | null {
  try {
    return sessionStorage.getItem(PENDING_MESSAGE_KEY)
  } catch {
    return null
  }
}

export function readContactLineHandoffChatUrl(): string | null {
  try {
    return sessionStorage.getItem(PENDING_CHAT_URL_KEY)
  } catch {
    return null
  }
}

/** หลังส่งฟอร์มสำเร็จ — ใช้แสดงหน้า success เมื่อกลับจาก LINE (มือถือ reload หน้า) */
export function markContactHandoffSuccessPending(): void {
  try {
    sessionStorage.setItem(PENDING_SUCCESS_UI_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function takeContactHandoffSuccessPending(): boolean {
  try {
    const pending = sessionStorage.getItem(PENDING_SUCCESS_UI_KEY) === '1'
    sessionStorage.removeItem(PENDING_SUCCESS_UI_KEY)
    return pending
  } catch {
    return false
  }
}

export function wasContactLineHandoffPushed(): boolean {
  try {
    return sessionStorage.getItem(PENDING_PUSHED_KEY) === '1'
  } catch {
    return false
  }
}

export function contactLineHandoffUrl(message: string): string {
  return lineOaStarterMessageUrl(message)
}

/** URL เปิด LINE — เสมอใช้ oaMessage พร้อมข้อความในช่องพิมพ์ (ลูกค้ากดส่ง → ทีมเห็นใน chat.line.biz) */
export function contactLineHandoffOpenUrl(chatUrl: string, message?: string): string {
  const fromUrl = chatUrl.trim()
  if (fromUrl) return fromUrl
  const msg = message?.trim()
  return msg ? lineOaStarterMessageUrl(msg) : lineOaStarterMessageUrl()
}

/**
 * หลังกดส่งฟอร์ม — เปิด LINE พร้อมข้อความในช่องพิมพ์ (user gesture)
 */
export function openContactLineHandoffAfterSubmit(input: {
  chatUrl: string
  message: string
}): void {
  markLineOaContactPending()
  markContactHandoffSuccessPending()
  navigateToLineHandoff(contactLineHandoffOpenUrl(input.chatUrl, input.message))
}

/**
 * เปิดแชท LINE @npcreate พร้อมข้อความในช่องพิมพ์
 * — มือถือใช้ https://line.me โดยตรง (ไม่ใช้ line://) หลังผู้ใช้กดปุ่มหรือหลังส่งฟอร์ม
 */
export function navigateToLineHandoff(url?: string): void {
  const target = (url ?? readContactLineHandoffChatUrl() ?? '').trim()
  if (!target) {
    const msg = readContactLineHandoffMessage()
    if (!msg) return
    navigateToLineHandoff(contactLineHandoffUrl(msg))
    return
  }

  if (isMobileBrowser()) {
    window.location.assign(target)
    return
  }

  openLineUrlInPlace(target)
}

export function prepareLineInquiryHandoff(message: string): boolean {
  return persistContactLineHandoffState({
    message,
    chatUrl: contactLineHandoffUrl(message),
    pushedToChat: false,
  })
}

export function reopenLineInquiryHandoff(): void {
  const msg = readContactLineHandoffMessage()
  const chatUrl = readContactLineHandoffChatUrl() ?? (msg ? contactLineHandoffUrl(msg) : '')
  markLineOaContactPending()
  navigateToLineHandoff(contactLineHandoffOpenUrl(chatUrl, msg ?? undefined))
}
