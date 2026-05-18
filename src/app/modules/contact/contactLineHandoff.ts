import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'
import { openLineOaMessageLink } from '../../../shared/contact/lineOaOpen'

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

/** เปิดแชท LINE @npcreate — มือถือพยายามเปิดแอปโดยตรง ไม่ค้างหน้า line.me */
export function openLineChatForInquiry(chatUrl: string): void {
  openLineOaMessageLink(chatUrl)
}

/** @deprecated ใช้ openLineChatForInquiry */
export function navigateToLineHandoff(url?: string): void {
  if (url) openLineChatForInquiry(url)
}

export function reopenLineInquiryHandoff(chatUrl: string): void {
  openLineChatForInquiry(chatUrl)
}
