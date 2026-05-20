import { isSupabaseConfigured, supabase } from '../supabase/client'
import { isLineMessagingUserId } from './lineStaffOpenUrl'
import {
  pickLinePushRecipientFromCandidates,
  resolveLineMessagingRecipientIdWhenNoInbound,
} from './linePushRecipientCandidates'
import type { LeadLineIds } from './lineUserIdResolution'

const INBOUND_SCAN_LIMIT = 20

async function listRecentInboundLineUserIds(leadId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data } = await supabase
    .from('lead_line_messages')
    .select('line_user_id')
    .eq('lead_id', leadId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(INBOUND_SCAN_LIMIT)

  return (data ?? [])
    .map((row) => row.line_user_id?.trim())
    .filter((id): id is string => Boolean(id && isLineMessagingUserId(id)))
}

/** ID สำหรับ push — ยืนยันจาก webhook ก่อน; เมื่อ Login/OA ไม่ตรงกัน ไม่ใช้ Login id */
export async function resolveLeadLinePushRecipient(
  lead: LeadLineIds & { id: string },
): Promise<string | null> {
  const inboundIds = await listRecentInboundLineUserIds(lead.id)
  if (inboundIds.length > 0) {
    return pickLinePushRecipientFromCandidates(lead, inboundIds)
  }
  return resolveLineMessagingRecipientIdWhenNoInbound(lead)
}
