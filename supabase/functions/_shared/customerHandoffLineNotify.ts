import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { buildLinePushCandidateIds } from './linePushRecipient.ts'

/**
 * ข้อความ "Customer Handoff" — ส่งหนึ่งครั้งตอน Lead กลายเป็น Customer
 *
 * จุดประสงค์ทางธุรกิจ:
 *   - บอกลูกค้าว่าเริ่มงานแล้ว / มีช่องทางตามงานต่อ
 *   - ดึงลูกค้าเข้า Client Workspace เพื่อย้ายการสื่อสารไปห้องโปรเจกต์
 *   - ห้อง LINE OA ยังใช้ทักทาย/แจ้งเตือนระบบได้เหมือนเดิม
 *
 * Dedupe:
 *   - บันทึก outbound message ลง `lead_line_messages` พร้อม
 *     metadata `{ source: 'customer_handoff', customer_id }`
 *   - ก่อนส่งจะเช็คว่ามี row เดิมไหม — ป้องกัน double-fire จาก:
 *     1) Frontend `linkCustomerForQuotation` (สถานะ `paid`)
 *     2) Cascade หลัง `payment_confirmed` ใน Edge
 *     3) Manual retry / refresh
 */

const DEFAULT_PORTAL_ORIGIN = 'https://app.npcreate.co.th'

function clientPortalLoginUrl(): string {
  const origin =
    Deno.env.get('VITE_APP_URL')?.trim() ||
    Deno.env.get('CONTACT_OAUTH_RETURN_ORIGIN')?.trim() ||
    DEFAULT_PORTAL_ORIGIN
  return `${origin.replace(/\/$/, '')}/login`
}

function buildHandoffMessage(brandName: string): string {
  const name = brandName.trim() || 'ลูกค้า'
  const loginUrl = clientPortalLoginUrl()

  return [
    `ขอบคุณคุณ ${name} ที่ไว้วางใจให้ NP Create ดูแลโปรเจกต์นี้นะคะ 🎉`,
    '',
    'ทีมเริ่มลงงานในระบบให้แล้ว — เข้า Client Workspace ได้ที่:',
    loginUrl,
    '(เข้าสู่ระบบด้วย LINE บัญชีนี้)',
    '',
    'ใน Workspace จะดู:',
    '• สถานะ/ความคืบหน้างาน',
    '• ไฟล์ส่งงาน',
    '• แชทกับทีมโปรเจกต์โดยตรง',
    '',
    'มีข้อสงสัย ทักกลับห้องนี้ได้ตลอดเวลาค่ะ',
  ].join('\n')
}

async function linePushText(to: string, text: string): Promise<boolean> {
  const token = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
  if (!token) return false

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn(
      'customer-handoff LINE push failed',
      to.slice(0, 8),
      res.status,
      err.slice(0, 200),
    )
    return false
  }
  return true
}

export async function notifyCustomerHandoffLine(
  admin: SupabaseClient,
  customerId: string,
): Promise<{ ok: boolean; skipped?: string; pushed?: boolean }> {
  const { data: customer, error: cErr } = await admin
    .from('customers')
    .select('id, brand_name, lead_id')
    .eq('id', customerId)
    .maybeSingle()

  if (cErr || !customer) {
    return { ok: false, skipped: 'customer_not_found' }
  }

  const leadId: string | null = customer.lead_id ?? null

  if (!leadId) {
    // ลูกค้าที่ไม่ผูก lead (เช่น manual insert) — ไม่มี LINE ID ใช้ส่ง
    return { ok: true, skipped: 'no_lead_link' }
  }

  const { data: lead } = await admin
    .from('leads')
    .select('brand_name, line_user_id, line_oa_chat_user_id')
    .eq('id', leadId)
    .maybeSingle()

  const brandName = lead?.brand_name?.trim() || customer.brand_name?.trim() || 'ลูกค้า'
  const lineUserId = lead?.line_user_id ?? null
  const lineOaChatUserId = lead?.line_oa_chat_user_id ?? null

  // Dedupe — ส่งครั้งเดียวต่อ customer
  const { data: prior } = await admin
    .from('lead_line_messages')
    .select('id')
    .eq('lead_id', leadId)
    .eq('direction', 'outbound')
    .contains('metadata', { source: 'customer_handoff', customer_id: customerId })
    .limit(1)

  if (prior?.length) {
    return { ok: true, skipped: 'already_sent' }
  }

  const candidates = buildLinePushCandidateIds({ lineUserId, lineOaChatUserId })
  if (candidates.length === 0) {
    return { ok: true, skipped: 'no_line_recipient' }
  }

  const text = buildHandoffMessage(brandName)

  for (const to of candidates) {
    const pushed = await linePushText(to, text)
    if (pushed) {
      await admin.from('lead_line_messages').insert({
        lead_id: leadId,
        line_user_id: to,
        direction: 'outbound',
        body: text,
        message_type: 'text',
        metadata: {
          source: 'customer_handoff',
          customer_id: customerId,
        },
      })
      return { ok: true, pushed: true }
    }
  }

  return { ok: true, skipped: 'push_failed' }
}
