import {
  isMobileBrowser,
  lineOaMessageUrlWithText,
  openStaffLineChat,
  staffLineChatUrl,
  staffLineOaInboxUrl,
} from './lineStaffOpenUrl'
import { resolveLeadLinePushRecipient } from './resolveLeadLinePushRecipient'
import {
  type LeadLineIds,
  resolveLineMessagingRecipientId,
} from './lineUserIdResolution'
import { isSupabaseConfigured, supabase } from '../supabase/client'
import { parseFunctionInvokeError } from '../supabase/parseFunctionInvokeError'
import type { QuotationFlexPayload } from './quotationFlexMessage'

export {
  isLineMessagingUserId,
  isValidLineUserId,
  clearRememberedLineChatBizAccountIfMatchesUser,
  getStaffLineChatBizAccountId,
  LINE_CHAT_BIZ_ACCOUNT_ID,
  rememberLineChatBizAccountFromInput,
  openStaffLineChat,
  openStaffLineChatFromUserId,
  resolveStaffLineChatOpenUrl,
  staffLineChatUrl,
  staffLineDirectChatHint,
  staffLineDirectUserChatUrl,
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
  /** ลิงก์ดาวน์โหลด PDF จาก Storage (signed URL) */
  pdfDownloadUrl?: string | null
}): string {
  const months =
    input.contractMonths != null && input.contractMonths > 0
      ? `ระยะสัญญา ${input.contractMonths} เดือน · `
      : ''
  const lines = [
    `สวัสดีครับ/ค่ะ — ใบเสนอราคา ${input.quotationNumber} สำหรับ ${input.brandName}`,
    '',
    `${months}ยอดรวม ${input.totalLabel}`,
    '',
    'เปิดดูและยอมรับใบเสนอราคาออนไลน์:',
    input.publicUrl,
  ]
  if (input.pdfDownloadUrl?.trim()) {
    lines.push('', 'ดาวน์โหลดไฟล์ PDF โดยตรง:', input.pdfDownloadUrl.trim())
  } else {
    lines.push('', '(เปิดลิงก์ด้านบนแล้วกดพิมพ์ / บันทึกเป็น PDF ได้)')
  }
  lines.push('', 'หากมีคำถาม ตอบกลับทางแชทนี้ได้เลยครับ/ค่ะ — ทีม NP Create')
  return lines.join('\n')
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

export interface SendLinePushOptions {
  leadId?: string
  /** บังคับ user id สำหรับ push (ต้องตรงกับที่ resolveLeadLinePushRecipient แล้ว) */
  pushTo?: string
  metadata?: Record<string, unknown>
  /** LINE Flex bubble (ส่งคู่ข้อความ text สั้น ๆ ได้) */
  flex?: QuotationFlexPayload
}

/** ส่ง push ผ่าน Edge Function — ต้องมี LINE_MESSAGING_CHANNEL_ACCESS_TOKEN บน Supabase */
export async function sendLinePushMessage(
  lineUserId: string,
  text: string,
  options?: SendLinePushOptions,
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

  const trimmed = text.trim()
  if (!trimmed && !options?.flex) {
    throw new Error('ต้องมีข้อความหรือ Flex Message')
  }

  const body: Record<string, unknown> = { to }
  if (trimmed) body.text = trimmed
  if (options?.leadId) body.lead_id = options.leadId
  if (options?.metadata && typeof options.metadata === 'object')
    body.metadata = options.metadata
  if (options?.flex) {
    body.flex_alt_text = options.flex.altText
    body.flex_contents = options.flex.contents
  }

  const { data, error } = await supabase.functions.invoke('send-line-push', {
    body,
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

/** เลือก user id สำหรับ Push — สอดคล้องแชท CRM (ข้อความเข้า OA ก่อน แล้วค่อย ID ในฟอร์ม) */
async function resolvePushRecipient(
  lineIds: string | LeadLineIds | null | undefined,
  leadId?: string,
): Promise<string | null> {
  if (!lineIds) return null
  if (typeof lineIds === 'string') return lineIds.trim() || null

  const lid = leadId?.trim()
  if (lid) {
    const fromLead = await resolveLeadLinePushRecipient({
      id: lid,
      line_user_id: lineIds.line_user_id,
      line_oa_chat_user_id: lineIds.line_oa_chat_user_id,
    })
    if (fromLead) return fromLead
  }

  return resolveLineMessagingRecipientId(lineIds)
}

/** Push ถ้ามี user id + token — ใช้ ID ที่ยืนยันกับ OA แล้ว (เหมือนแชท CRM) */
export async function deliverLineMessageToCustomer(
  lineIds: string | LeadLineIds | null | undefined,
  text: string,
  pushOptions?: SendLinePushOptions,
): Promise<LineSendResult> {
  const explicit = pushOptions?.pushTo?.trim()
  const recipient =
    explicit ||
    (await resolvePushRecipient(lineIds, pushOptions?.leadId))
  if (recipient) {
    return sendLinePushMessage(recipient, text, pushOptions)
  }
  const copied = await copyTextToClipboard(text)
  openLineOaWithText(text, typeof lineIds === 'string' ? lineIds : lineIds?.line_user_id)
  return {
    mode: copied ? 'open_oa' : 'copy_only',
    message: copied
      ? 'ไม่มี LINE User ID — คัดลอกข้อความและเปิด LINE แล้ว วางข้อความส่งลูกค้าเอง'
      : 'ไม่มี LINE User ID — เปิด LINE แล้วพิมพ์ส่งลูกค้าเอง',
  }
}
