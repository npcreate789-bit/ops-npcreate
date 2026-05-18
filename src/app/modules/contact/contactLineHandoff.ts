import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'
import {
  openLineHandoffPopup,
  openLineOaMessageLink,
  scheduleContactHandoffWindowClose,
} from '../../../shared/contact/lineOaOpen'

export interface ContactHandoffState {
  lineMessage: string
  chatUrl: string
  lineDelivery: 'user_send_required' | 'confirmation_pushed'
  leadId: string
}

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

export function contactLineHandoffUrl(message: string): string {
  return lineOaStarterMessageUrl(message)
}

export { openLineHandoffPopup }

/** เปิด LINE ในแท็บแยก — ไม่พา /contact ไป line.me */
export function openLineChatForInquiry(
  chatUrl: string,
  handoffWindow: Window | null = null,
): void {
  openLineOaMessageLink(chatUrl, handoffWindow)
}

/** ปิดแท็บ handoff + ออกจาก /contact หลังเปิด LINE */
export function finishContactHandoffAfterSubmit(handoffWindow: Window | null): void {
  scheduleContactHandoffWindowClose(handoffWindow)
}

/** @deprecated */
export function navigateToLineHandoff(url?: string): void {
  if (url) openLineChatForInquiry(url)
}

export function reopenLineInquiryHandoff(chatUrl: string): void {
  const win = openLineHandoffPopup()
  openLineChatForInquiry(chatUrl, win)
  finishContactHandoffAfterSubmit(win)
}
