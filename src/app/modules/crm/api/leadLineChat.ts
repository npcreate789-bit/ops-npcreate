import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { resolveLineMessagingRecipientId } from '../../../../shared/line/lineUserIdResolution'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'
import type { Lead } from '../types'
import type { LeadLineMessage } from '../types/leadLineChat'

export async function listLeadLineMessages(leadId: string): Promise<LeadLineMessage[]> {
  if (!isSupabaseConfigured || !supabase) {
    const { mockLeadLineMessages } = await import('./mockLeadLineChat')
    return mockLeadLineMessages.list(leadId)
  }

  const { data, error } = await supabase
    .from('lead_line_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as LeadLineMessage[]
}

export async function sendLeadLineChatMessage(
  lead: Pick<Lead, 'id' | 'line_user_id' | 'line_oa_chat_user_id'>,
  text: string,
  senderProfileId?: string | null,
): Promise<void> {
  const body = text.trim()
  if (!body) throw new Error('กรุณาพิมพ์ข้อความ')

  const to = resolveLineMessagingRecipientId({
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  })
  if (!to) {
    throw new Error('ยังไม่มี LINE User ID สำหรับส่งข้อความ — บันทึก ID จาก chat.line.biz ก่อน')
  }

  if (!isSupabaseConfigured || !supabase) {
    const { mockLeadLineMessages } = await import('./mockLeadLineChat')
    mockLeadLineMessages.append(lead.id, {
      lead_id: lead.id,
      line_user_id: to,
      direction: 'outbound',
      body,
      message_type: 'text',
      line_message_id: null,
      sender_profile_id: senderProfileId ?? null,
    })
    return
  }

  const { data, error } = await supabase.functions.invoke('send-line-push', {
    body: { to, text: body, lead_id: lead.id },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    throw new Error(message)
  }

  const result = data as { ok?: boolean; error?: string } | null
  if (result?.error) throw new Error(result.error)
}
