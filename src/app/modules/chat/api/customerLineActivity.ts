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

export type CustomerLineMessageDirection = 'inbound' | 'outbound'

export interface CustomerLineMessagePreview {
  id: string
  direction: CustomerLineMessageDirection
  body: string
  message_type: string
  created_at: string
}

export interface CustomerLineActivity {
  leadId: string | null
  hasLineEvidence: boolean
  latestInboundAt: string | null
  /** ข้อความล่าสุด (สลับเรียงเก่า → ใหม่) สำหรับแสดง read-only preview */
  preview: CustomerLineMessagePreview[]
  /**
   * ทราบว่าโหลด activity เสร็จแล้ว — ใช้แยกสถานะ
   * "ยังไม่เคยโหลด" จาก "โหลดแล้วและไม่มี LINE evidence"
   * (สำคัญสำหรับ Phase 2E fallback banner ที่ต้องรอจน loaded ก่อน)
   */
  loaded: boolean
}

const EMPTY: CustomerLineActivity = {
  leadId: null,
  hasLineEvidence: false,
  latestInboundAt: null,
  preview: [],
  loaded: false,
}

const RECENT_INBOUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const PREVIEW_LIMIT = 5

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
  if (!leadId) {
    return { ...EMPTY, loaded: true }
  }

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
    return {
      leadId,
      hasLineEvidence: false,
      latestInboundAt: null,
      preview: [],
      loaded: true,
    }
  }

  /*
   * ดึงทั้ง preview list + latest inbound time พร้อมกัน 1 รอบ
   * (เรียงใหม่→เก่า แล้วค่อย reverse ฝั่ง client ให้แสดงเก่า→ใหม่)
   */
  const { data: rows } = await supabase
    .from('lead_line_messages')
    .select('id, direction, body, message_type, created_at')
    .eq('lead_id', leadId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PREVIEW_LIMIT)

  const newestFirst = (rows ?? []) as CustomerLineMessagePreview[]
  const preview = [...newestFirst].reverse()

  const cutoffMs = Date.now() - RECENT_INBOUND_WINDOW_MS
  const latestInbound = newestFirst.find((m) => {
    if (m.direction !== 'inbound') return false
    const ts = new Date(m.created_at).getTime()
    return Number.isFinite(ts) && ts >= cutoffMs
  })

  return {
    leadId,
    hasLineEvidence: true,
    latestInboundAt: latestInbound?.created_at ?? null,
    preview,
    loaded: true,
  }
}
