import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'
import { openLineUrlInPlace } from '../../../shared/contact/lineInPlaceOpen'
import { isMobileBrowser } from '../../../shared/line/lineStaffOpenUrl'

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

/**
 * เปิดแชท LINE @npcreate พร้อมข้อความจากฟอร์ม
 * ใช้เฉพาะ https://line.me/R/oaMessage/ — ไม่ใช้ line:// (deprecated, ทำให้ LINE แจ้ง "ไม่สามารถเชื่อมต่อได้")
 * มือถือ: เปิดแอปผ่าน universal link โดยไม่พาเบราว์เซอร์ออกจากหน้า success
 */
export function openLineChatForInquiry(chatUrl: string): void {
  const target = chatUrl.trim()
  if (!target) return

  if (isMobileBrowser()) {
    openLineUrlInPlace(target)
    return
  }

  window.open(target, '_blank', 'noopener,noreferrer')
}

/** @deprecated ใช้ openLineChatForInquiry */
export function navigateToLineHandoff(url?: string): void {
  if (url) openLineChatForInquiry(url)
}

export function reopenLineInquiryHandoff(chatUrl: string): void {
  openLineChatForInquiry(chatUrl)
}
