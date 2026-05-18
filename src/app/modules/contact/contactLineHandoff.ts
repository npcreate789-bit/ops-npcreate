import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'
import { openLineUrlInPlace } from '../../../shared/contact/lineInPlaceOpen'

const PENDING_MESSAGE_KEY = 'npc_contact_handoff_line_message'
const PENDING_CHAT_URL_KEY = 'npc_contact_handoff_chat_url'
const PENDING_PUSHED_KEY = 'npc_contact_handoff_pushed'

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

export function persistContactLineHandoffState(input: {
  message: string
  chatUrl: string
  pushedToChat: boolean
}): boolean {
  const trimmed = input.message.trim()
  if (!trimmed) return false
  try {
    sessionStorage.setItem(PENDING_MESSAGE_KEY, trimmed)
    sessionStorage.setItem(PENDING_CHAT_URL_KEY, input.chatUrl)
    sessionStorage.setItem(PENDING_PUSHED_KEY, input.pushedToChat ? '1' : '0')
  } catch {
    return false
  }
  return true
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

/** เปิดแชท LINE @npcreate โดยไม่พาเว็บออกจากหน้า / ไม่ใช้ line:// (ลดแจ้งเตือนเปิดแอป) */
export function navigateToLineHandoff(url?: string): void {
  const target = (url ?? readContactLineHandoffChatUrl() ?? '').trim()
  if (!target) {
    const msg = readContactLineHandoffMessage()
    if (!msg) return
    navigateToLineHandoff(contactLineHandoffUrl(msg))
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
  navigateToLineHandoff()
}
