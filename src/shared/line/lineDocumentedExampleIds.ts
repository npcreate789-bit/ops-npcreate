/** ID ตัวอย่างในเอกสาร/placeholder — ห้ามบันทึกหรือใช้ push (ไม่ใช่ลูกค้าจริง) */
export const DOCUMENTED_LINE_CHAT_USER_EXAMPLE_IDS = [
  'U1bfd708d6595baea50b50568a7b84b5f',
] as const

export const DOCUMENTED_LINE_CHAT_BIZ_ACCOUNT_EXAMPLE_IDS = [
  'U2626213ac7c9081487572e27c76826db',
] as const

export function isDocumentedLineChatUserExampleId(id: string | null | undefined): boolean {
  const t = id?.trim().toLowerCase()
  if (!t) return false
  return DOCUMENTED_LINE_CHAT_USER_EXAMPLE_IDS.some((ex) => ex.toLowerCase() === t)
}

export function isDocumentedLineChatBizAccountExampleId(id: string | null | undefined): boolean {
  const t = id?.trim().toLowerCase()
  if (!t) return false
  return DOCUMENTED_LINE_CHAT_BIZ_ACCOUNT_EXAMPLE_IDS.some((ex) => ex.toLowerCase() === t)
}

export function documentedLineChatUserExampleError(): string {
  return (
    'นี่เป็น User ID ตัวอย่างในเอกสารระบบ ไม่ใช่ลูกค้าจริง — ' +
    'เปิดแชทลูกค้าบน chat.line.biz แล้วคัดลอก URL เต็ม (ส่วนหลัง /chat/)'
  )
}
