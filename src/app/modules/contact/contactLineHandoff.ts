import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'
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

function lineSchemeUrl(httpsUrl: string): string | null {
  try {
    const parsed = new URL(httpsUrl)
    if (!parsed.pathname.includes('/oaMessage/')) return null
    return `line:/${parsed.pathname}${parsed.search}`
  } catch {
    return null
  }
}

/**
 * เปิดแชท LINE @npcreate พร้อมข้อความจากฟอร์ม
 * ลูกค้ากดส่งในแอป → ข้อความเข้า inbox ทีม NP Create
 */
export function openLineChatForInquiry(chatUrl: string): void {
  const target = chatUrl.trim()
  if (!target) return

  if (isMobileBrowser()) {
    const scheme = lineSchemeUrl(target)
    if (scheme) {
      window.location.assign(scheme)
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.assign(target)
        }
      }, 500)
      return
    }
  }

  window.location.assign(target)
}

/** @deprecated ใช้ openLineChatForInquiry */
export function navigateToLineHandoff(url?: string): void {
  if (url) openLineChatForInquiry(url)
}

export function reopenLineInquiryHandoff(chatUrl: string): void {
  openLineChatForInquiry(chatUrl)
}
