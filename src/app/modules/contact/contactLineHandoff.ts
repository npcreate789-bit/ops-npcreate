import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'
import { isMobileBrowser } from '../../../shared/line/lineStaffOpenUrl'

const PENDING_MESSAGE_KEY = 'npc_contact_handoff_line_message'

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

export function persistContactLineHandoffMessage(message: string): void {
  try {
    sessionStorage.setItem(PENDING_MESSAGE_KEY, message.trim())
  } catch {
    /* ignore */
  }
}

export function readContactLineHandoffMessage(): string | null {
  try {
    return sessionStorage.getItem(PENDING_MESSAGE_KEY)
  } catch {
    return null
  }
}

export function contactLineHandoffUrl(message: string): string {
  return lineOaStarterMessageUrl(message)
}

/**
 * เปิดแชท LINE @npcreate พร้อมข้อความจากฟอร์ม
 * ใช้ navigation / แท็บใหม่ — ไม่ใช้ iframe (มักถูกบล็อกและไม่ส่งข้อความไป OA)
 *
 * @returns true เมื่อเบราว์เซอร์กำลังออกจากหน้า /contact (มือถือหรือ popup ถูกบล็อก)
 */
export function openLineInquiryAndHandoff(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false

  persistContactLineHandoffMessage(trimmed)
  const url = contactLineHandoffUrl(trimmed)

  if (isMobileBrowser()) {
    window.location.assign(url)
    return true
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer')
  if (!popup) {
    window.location.assign(url)
    return true
  }
  return false
}

/** เปิด LINE อีกครั้งจากหน้ารอ handoff (เดสก์ท็อป) */
export function reopenLineInquiryHandoff(): void {
  const msg = readContactLineHandoffMessage()
  if (!msg) return
  openLineInquiryAndHandoff(msg)
}
