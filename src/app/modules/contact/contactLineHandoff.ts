import { openLineOaStarterMessageFromContact } from '../../../shared/contact/channelConnectConfig'

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

/** เปิดแชท LINE พร้อมข้อความจากฟอร์ม แล้วพยายามปิดแท็บเบราว์เซอร์ (มือถือจะสลับไปแอป LINE) */
export function openLineInquiryAndHandoff(message: string): void {
  openLineOaStarterMessageFromContact(message)
  window.setTimeout(() => {
    try {
      window.close()
    } catch {
      /* ปิดได้เฉพาะหน้าต่างที่สคริปต์เปิด — มือถือมักสลับไป LINE อยู่แล้ว */
    }
  }, 400)
}
