import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'

const PENDING_MESSAGE_KEY = 'npc_contact_handoff_line_message'

/** รอ fallback UI ถ้าเบราว์เซอร์ไม่ออกจากหน้า */
export const LINE_HANDOFF_FALLBACK_UI_MS = 900

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

/** เปิดแชท LINE @npcreate พร้อมข้อความ (เรียกทันทีหลังกดส่ง — ยังอยู่ใน user gesture chain) */
export function navigateToLineHandoff(message?: string): void {
  const trimmed = (message ?? readContactLineHandoffMessage() ?? '').trim()
  if (!trimmed) return

  const url = contactLineHandoffUrl(trimmed)

  try {
    const link = document.createElement('a')
    link.href = url
    link.rel = 'noopener noreferrer'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch {
    /* ignore */
  }
  window.location.assign(url)
}

/** บันทึกข้อความก่อนเปิด LINE */
export function prepareLineInquiryHandoff(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false
  persistContactLineHandoffMessage(trimmed)
  return true
}

/** เปิด LINE อีกครั้งจากหน้ารอ handoff */
export function reopenLineInquiryHandoff(): void {
  navigateToLineHandoff()
}
