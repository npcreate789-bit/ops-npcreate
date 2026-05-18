import { lineOaStarterMessageUrl } from '../../../shared/contact/channelConnectConfig'

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
 * เปิดแชท LINE @npcreate พร้อม ?text= จากฟอร์ม แล้วออกจากหน้า /contact
 * (มือถือ → แอป LINE, เดสก์ท็อป → line.me ในแท็บเดียวกัน)
 */
export function openLineInquiryAndHandoff(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return false

  persistContactLineHandoffMessage(trimmed)
  const url = contactLineHandoffUrl(trimmed)
  window.location.assign(url)
  return true
}

/** เปิด LINE อีกครั้ง (กรณีผู้ใช้ยังอยู่บนหน้ารอ) */
export function reopenLineInquiryHandoff(): void {
  const msg = readContactLineHandoffMessage()
  if (!msg) return
  openLineInquiryAndHandoff(msg)
}
