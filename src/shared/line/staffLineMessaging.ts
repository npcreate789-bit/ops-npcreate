import {
  isMobileBrowser,
  lineOaMessageUrlWithText,
  openStaffLineChat,
  staffLineChatUrl,
  staffLineOaInboxUrl,
} from './lineStaffOpenUrl'
import { isSupabaseConfigured, supabase } from '../supabase/client'
import { parseFunctionInvokeError } from '../supabase/parseFunctionInvokeError'

export {
  isLineMessagingUserId,
  isValidLineUserId,
  LINE_CHAT_BIZ_ACCOUNT_ID,
  openStaffLineChat,
  staffLineChatUrl,
  staffLineDirectChatHint,
  staffLineDirectUserChatUrl,
  staffLineManagerInboxUrl,
  staffLineOaInboxUrl,
} from './lineStaffOpenUrl'

export type LineDeliveryMode = 'push' | 'open_oa' | 'copy_only'

export interface LineSendResult {
  mode: LineDeliveryMode
  message?: string
}

/** ลิงก์เปิดแชท OA — ใส่ข้อความล่วงหน้าได้ (MVP เมื่อไม่มี Messaging API) */
export function lineOaMessageUrl(text?: string, lineUserId?: string | null): string {
  return staffLineChatUrl(lineUserId, text ? { text } : undefined)
}

/** เปิด LINE — แชทตรงลูกค้าบน desktop เมื่อมี line_user_id, ไม่เช่นนั้น OA + text */
export function openLineOaWithText(text: string, lineUserId?: string | null): void {
  const trimmed = text.trim()
  const uid = lineUserId?.trim()
  if (uid && staffLineOaInboxUrl()) {
    void openStaffLineChat(uid)
    return
  }
  const url = isMobileBrowser()
    ? lineOaMessageUrlWithText(trimmed)
    : staffLineChatUrl(null, { text: trimmed })
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function adminClientWizardPath(customerId?: string): string {
  return customerId ? `/app/admin?customerId=${encodeURIComponent(customerId)}` : '/app/admin'
}

export function buildQuotationReferenceMessage(input: {
  brandName: string
  servicesLabel?: string | null
  quotationNumber?: string | null
  itemsSummary: string
  totalLabel: string
  staffNote?: string | null
}): string {
  const lines = [
    'สวัสดีครับ/ค่ะ จากทีม NP Create (@npcreate)',
    '',
    `แบรนด์: ${input.brandName}`,
  ]
  if (input.servicesLabel) lines.push(`บริการที่สนใจ: ${input.servicesLabel}`)
  if (input.quotationNumber) lines.push(`อ้างอิงใบเสนอราคา: ${input.quotationNumber}`)
  lines.push('', 'สรุปรายการ:', input.itemsSummary)
  lines.push('', `ยอดรวมโดยประมาณ: ${input.totalLabel}`)
  if (input.staffNote?.trim()) {
    lines.push('', input.staffNote.trim())
  }
  lines.push(
    '',
    'ทีมจะส่งใบเสนอราคาอย่างเป็นทางการให้หลังคุยรายละเอียดครบ — หากสะดวกตอบกลับทางแชทนี้ได้เลยครับ/ค่ะ',
  )
  return lines.join('\n')
}

export function buildQuotationSendMessage(input: {
  brandName: string
  quotationNumber: string
  publicUrl: string
  totalLabel: string
  contractMonths?: number | null
}): string {
  const months =
    input.contractMonths != null && input.contractMonths > 0
      ? `ระยะสัญญา ${input.contractMonths} เดือน · `
      : ''
  return [
    `สวัสดีครับ/ค่ะ — ใบเสนอราคา ${input.quotationNumber} สำหรับ ${input.brandName}`,
    '',
    `${months}ยอดรวม ${input.totalLabel}`,
    '',
    'เปิดดูและยอมรับใบเสนอราคาได้ที่ลิงก์:',
    input.publicUrl,
    '',
    'หากมีคำถาม ตอบกลับทางแชทนี้ได้เลยครับ/ค่ะ — ทีม NP Create',
  ].join('\n')
}

export function buildClientPortalCredentialsMessage(input: {
  brandName: string
  loginUrl: string
  loginId: string
  temporaryPassword: string
}): string {
  return [
    `บัญชีพื้นที่ลูกค้า — ${input.brandName}`,
    '',
    `เข้าสู่ระบบ: ${input.loginUrl}`,
    `รหัสผู้ใช้: ${input.loginId}`,
    `รหัสผ่านชั่วคราว: ${input.temporaryPassword}`,
    '',
    'กรุณาเปลี่ยนรหัสผ่านหลัง login ครั้งแรก',
    'ทีม NP Create',
  ].join('\n')
}

/** ส่ง push ผ่าน Edge Function — ต้องมี LINE_MESSAGING_CHANNEL_ACCESS_TOKEN บน Supabase */
export async function sendLinePushMessage(
  lineUserId: string,
  text: string,
): Promise<LineSendResult> {
  const to = lineUserId.trim()
  if (!to) {
    throw new Error('ไม่มี LINE User ID ของลูกค้า')
  }

  if (!isSupabaseConfigured || !supabase) {
    await copyTextToClipboard(text)
    openLineOaWithText(text, to)
    return { mode: 'open_oa', message: 'โหมดพัฒนา — เปิด LINE และคัดลอกข้อความแล้ว' }
  }

  const { data, error } = await supabase.functions.invoke('send-line-push', {
    body: { to, text },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    if (
      message.includes('not configured') ||
      message.includes('LINE_MESSAGING') ||
      message.includes('deploy')
    ) {
      await copyTextToClipboard(text)
      openLineOaWithText(text, to)
      return { mode: 'open_oa', message: 'ยังไม่ได้ตั้ง Messaging API — เปิด LINE และคัดลอกข้อความแล้ว' }
    }
    throw new Error(message)
  }

  const result = data as { ok?: boolean; error?: string; mode?: string } | null
  if (result && typeof result === 'object' && result.error) {
    if (result.error.includes('not configured') || result.error.includes('LINE_MESSAGING')) {
      await copyTextToClipboard(text)
      openLineOaWithText(text, to)
      return { mode: 'open_oa', message: 'ยังไม่ได้ตั้ง Messaging API — เปิด LINE และคัดลอกข้อความแล้ว' }
    }
    throw new Error(result.error)
  }

  return { mode: 'push' }
}

/** Push ถ้ามี line_user_id + token — ไม่เช่นนั้น copy + เปิด OA */
export async function deliverLineMessageToCustomer(
  lineUserId: string | null | undefined,
  text: string,
): Promise<LineSendResult> {
  if (lineUserId?.trim()) {
    return sendLinePushMessage(lineUserId, text)
  }
  const copied = await copyTextToClipboard(text)
  openLineOaWithText(text, lineUserId)
  return {
    mode: copied ? 'open_oa' : 'copy_only',
    message: copied
      ? 'ไม่มี LINE User ID — คัดลอกข้อความและเปิด LINE แล้ว วางข้อความส่งลูกค้าเอง'
      : 'ไม่มี LINE User ID — เปิด LINE แล้วพิมพ์ส่งลูกค้าเอง',
  }
}
