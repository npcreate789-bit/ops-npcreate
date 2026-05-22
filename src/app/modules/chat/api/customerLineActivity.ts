import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

/**
 * ใช้ใน Project Chat แสดงปุ่ม/แบนเนอร์ "เปิดแชท LINE OA" เมื่อ:
 *   - ลูกค้านี้มี Lead ต้นทาง (`customer.lead_id`)
 *   - Lead มีร่องรอย LINE (channel = 'line' หรือมี line_*_user_id)
 *   - มี inbound message ล่าสุดในกรอบ 7 วัน (อยากเตือนทีมเมื่อยังมี activity จริง)
 *
 * RLS: ทำงานกับสิทธิ์ของผู้เรียกตรง ๆ — ถ้า viewer ไม่ใช่ owner / privileged / admin
 * จะได้ผลลัพธ์ `hasLineEvidence=false` (ไม่ขึ้น banner) ซึ่งโอเค เพราะคนนั้น
 * เปิด CRM lead เห็นแชทไม่ได้อยู่แล้ว
 */
export interface CustomerLineActivity {
  leadId: string | null
  hasLineEvidence: boolean
  latestInboundAt: string | null
}

const EMPTY: CustomerLineActivity = {
  leadId: null,
  hasLineEvidence: false,
  latestInboundAt: null,
}

const RECENT_INBOUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export async function getCustomerLineActivity(
  customerId: string,
): Promise<CustomerLineActivity> {
  const id = customerId?.trim()
  if (!id || !isSupabaseConfigured || !supabase) return EMPTY

  const { data: customer } = await supabase
    .from('customers')
    .select('lead_id')
    .eq('id', id)
    .maybeSingle()

  const leadId = (customer?.lead_id as string | null) ?? null
  if (!leadId) return EMPTY

  const { data: lead } = await supabase
    .from('leads')
    .select('line_user_id, line_oa_chat_user_id, channel')
    .eq('id', leadId)
    .maybeSingle()

  const hasLineEvidence = Boolean(
    lead?.channel === 'line' ||
      (lead?.line_user_id as string | null)?.trim() ||
      (lead?.line_oa_chat_user_id as string | null)?.trim(),
  )

  if (!hasLineEvidence) {
    return { leadId, hasLineEvidence: false, latestInboundAt: null }
  }

  const cutoff = new Date(Date.now() - RECENT_INBOUND_WINDOW_MS).toISOString()
  const { data: latest } = await supabase
    .from('lead_line_messages')
    .select('created_at')
    .eq('lead_id', leadId)
    .eq('direction', 'inbound')
    .is('deleted_at', null)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(1)

  const latestInboundAt = (latest?.[0]?.created_at as string | null) ?? null
  return { leadId, hasLineEvidence: true, latestInboundAt }
}
