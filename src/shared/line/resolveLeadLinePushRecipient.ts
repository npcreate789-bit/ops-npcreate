import { isSupabaseConfigured, supabase } from '../supabase/client'
import { isLineMessagingUserId } from './lineStaffOpenUrl'
import {
  type LeadLineIds,
  resolveLineMessagingRecipientId,
} from './lineUserIdResolution'

/** ID สำหรับ push — ใช้จากข้อความเข้า (webhook) ก่อน เพราะยืนยันแล้วว่าตรงกับ OA */
export async function resolveLeadLinePushRecipient(
  lead: LeadLineIds & { id: string },
): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from('lead_line_messages')
      .select('line_user_id')
      .eq('lead_id', lead.id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const fromWebhook = data?.line_user_id?.trim()
    if (fromWebhook && isLineMessagingUserId(fromWebhook)) {
      return fromWebhook
    }
  }

  return resolveLineMessagingRecipientId(lead)
}
