import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'

export interface ContactLineConfirmationResult {
  pushed: boolean
  reason?: string
}

/**
 * ส่งข้อความยืนยันจาก OA ไปลูกค้า (ไม่แทนที่การกดส่งข้อมูลเข้าแชท)
 * ล้มเหลวได้ — ไม่ throw
 */
export async function deliverContactLineConfirmation(input: {
  leadId: string
  lineUserId: string
  inquiryText: string
}): Promise<ContactLineConfirmationResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { pushed: false, reason: 'dev_mode' }
  }

  const { data, error } = await supabase.functions.invoke('contact-line-handoff', {
    body: {
      lead_id: input.leadId,
      line_user_id: input.lineUserId,
      text: input.inquiryText,
      mode: 'confirmation_only',
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    console.warn('contact-line-handoff', message)
    return { pushed: false, reason: message }
  }

  const result = data as { ok?: boolean; pushed?: boolean; reason?: string } | null
  return {
    pushed: Boolean(result?.ok && result?.pushed),
    reason: result?.reason,
  }
}
