import { isDocumentedLineChatUserExampleId } from './lineDocumentedExampleIds'
import { isUsableLinePushUserId } from './linePushEligibility'
import { isSupabaseConfigured, supabase } from '../supabase/client'
import { isLineMessagingUserId } from './lineStaffOpenUrl'
import {
  type LeadLineIds,
  lineLoginAndOaIdsMismatch,
  resolveLineMessagingRecipientId,
} from './lineUserIdResolution'

function idsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function usableLineId(id: string | null | undefined): string | null {
  return isUsableLinePushUserId(id) ? id!.trim() : null
}

/**
 * ID ที่เคยใช้ push/รับจาก OA จริง — สำคัญกว่า ID ที่วางจาก URL เมื่อ Login กับ OA ไม่ตรงกัน
 */
async function pushUserIdFromMessageHistory(
  leadId: string,
  login: string,
  mismatch: boolean,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data } = await supabase
    .from('lead_line_messages')
    .select('line_user_id, direction')
    .eq('lead_id', leadId)
    .not('line_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!data?.length) return null

  const skipLoginOnOutbound = mismatch && Boolean(login)

  // ข้อความเข้าจาก webhook = user id บน OA ชุดนี้ (ใช้ได้แม้จะตรงกับ LINE Login ในฟอร์ม)
  for (const row of data) {
    if (row.direction !== 'inbound') continue
    const id = usableLineId(row.line_user_id as string)
    if (!id) continue
    return id
  }

  for (const row of data) {
    if (row.direction !== 'outbound') continue
    const id = usableLineId(row.line_user_id as string)
    if (!id) continue
    if (skipLoginOnOutbound && idsEqual(id, login)) continue
    return id
  }

  return null
}

/** ID สำหรับ push — ประวัติแชทที่ยืนยันกับ OA ก่อน แล้วค่อย ID ในฟอร์ม */
export async function resolveLeadLinePushRecipient(
  lead: LeadLineIds & { id: string },
  options?: { preferredInboundLineUserId?: string | null },
): Promise<string | null> {
  const login = lead.line_user_id?.trim() ?? ''
  const mismatch = lineLoginAndOaIdsMismatch(lead)

  const preferredInbound = isUsableLinePushUserId(options?.preferredInboundLineUserId)
    ? options!.preferredInboundLineUserId!.trim()
    : null
  if (preferredInbound) return preferredInbound

  const fromHistory = await pushUserIdFromMessageHistory(lead.id, login, mismatch)
  if (fromHistory) return fromHistory

  const fromForm = resolveLineMessagingRecipientId(lead)
  if (fromForm && !isDocumentedLineChatUserExampleId(fromForm)) {
    if (mismatch && login && idsEqual(fromForm, login)) return null
    return fromForm
  }

  if (!mismatch && login && isLineMessagingUserId(login)) return login

  return null
}
