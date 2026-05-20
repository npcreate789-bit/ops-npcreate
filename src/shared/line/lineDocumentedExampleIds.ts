/**
 * ID ที่เคยใช้ในตัวอย่างเอกสารเก่า (ก่อน 2026-05) — แจ้งเตือนเท่านั้น ไม่บล็อกบันทึก
 * เพราะทีมอาจคัดลอก URL จริงจาก chat.line.biz ที่ตรงกับตัวอย่างโดยบังเอิญ
 */
export const LEGACY_DOC_LINE_CHAT_USER_EXAMPLE_IDS = [
  'U1bfd708d6595baea50b50568a7b84b5f',
] as const

/** ใช้ใน placeholder / .env.example เท่านั้น — ไม่ใช่ ID จริง */
export const PLACEHOLDER_LINE_CHAT_USER_ID = 'U22222222222222222222222222222222'
export const PLACEHOLDER_LINE_CHAT_BIZ_ACCOUNT_ID = 'U11111111111111111111111111111111'

export function isLegacyDocLineChatUserExampleId(id: string | null | undefined): boolean {
  const t = id?.trim().toLowerCase()
  if (!t) return false
  return LEGACY_DOC_LINE_CHAT_USER_EXAMPLE_IDS.some((ex) => ex.toLowerCase() === t)
}

/** @deprecated ใช้ isLegacyDocLineChatUserExampleId */
export const isDocumentedLineChatUserExampleId = isLegacyDocLineChatUserExampleId

export function isDocumentedLineChatBizAccountExampleId(id: string | null | undefined): boolean {
  const t = id?.trim().toLowerCase()
  if (!t) return false
  return t === PLACEHOLDER_LINE_CHAT_BIZ_ACCOUNT_ID.toLowerCase()
}

export function legacyDocLineChatUserWarning(): string {
  return (
    'URL/ID นี้ตรงกับตัวอย่างในคู่มือระบบเก่า — ถ้าคัดลอกจากเอกสาร ให้เปิดแชทลูกค้าจริงบน chat.line.biz ' +
    'แล้วคัดลอก URL จากแถบที่อยู่แทน (ส่วนหลัง /chat/)'
  )
}
