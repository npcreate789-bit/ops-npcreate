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

/** ID สำหรับ push — ใช้จากข้อความเข้า (webhook) ก่อน เพราะยืนยันแล้วว่าตรงกับ OA */
export async function resolveLeadLinePushRecipient(
  lead: LeadLineIds & { id: string },
): Promise<string | null> {
  const oa = lead.line_oa_chat_user_id?.trim() ?? ''
  const login = lead.line_user_id?.trim() ?? ''
  const mismatch = lineLoginAndOaIdsMismatch(lead)

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
      // เมื่อบันทึก OA จาก URL แล้ว อย่าใช้ inbound เก่าที่เป็น LINE Login id
      if (mismatch && oa) {
        if (idsEqual(fromWebhook, oa)) return fromWebhook
      } else {
        return fromWebhook
      }
    }
  }

  const fromForm = resolveLineMessagingRecipientId(lead)
  if (fromForm) return fromForm

  // ไม่มี OA ในฟอร์ม — ใช้ login จาก webhook ถ้ามี (กรณีเชื่อมต่อ LINE อย่างเดียว)
  if (!mismatch && login && isLineMessagingUserId(login)) return login

  return null
}
