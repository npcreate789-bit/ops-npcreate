import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/**
 * Phase 2E fallback — เมื่อ helper ส่ง LINE OA ไม่ได้ (ไม่มี LINE ID หรือ
 * push ล้ม) ระบบจะใส่ user_notifications ให้ทีมที่เกี่ยวข้องเห็นในระฆัง
 * เพื่อให้ทีมรู้ว่าต้อง fallback ติดต่อมือ (โทร / Messenger / อีเมล)
 *
 * Dedupe key ใช้ `customer-line-fallback-<customer_id>` — รวมทุก event ของ
 * customer คนเดียวกันลงในระฆังเดียว (กัน spam) แล้ว upsert title/body
 * ให้แสดงเหตุการณ์ล่าสุด
 *
 * RLS ใช้ service_role ของ edge function ในการ insert (ไม่ผ่าน policy)
 */

const STAFF_FALLBACK_ROLES = ['sales', 'operations', 'ceo', 'admin', 'dev'] as const

async function findRecipientIds(
  admin: SupabaseClient,
  leadOwnerId: string | null,
): Promise<string[]> {
  const ids = new Set<string>()

  if (leadOwnerId) ids.add(leadOwnerId)

  const { data: roleRows } = await admin
    .from('user_roles')
    .select('user_id, role')
    .in('role', STAFF_FALLBACK_ROLES as unknown as string[])

  for (const row of roleRows ?? []) {
    const uid = row.user_id as string | null
    if (uid) ids.add(uid)
  }

  // กัน notify ไปยัง user ที่ปิด is_active แล้ว
  if (ids.size === 0) return []
  const { data: active } = await admin
    .from('profiles')
    .select('id')
    .eq('is_active', true)
    .in('id', Array.from(ids))

  return (active ?? []).map((r) => r.id as string)
}

export async function recordCustomerLineFallback(
  admin: SupabaseClient,
  input: {
    customerId: string
    leadOwnerId?: string | null
    brandName: string
    eventLabel: string
    reason: string
  },
): Promise<void> {
  const recipients = await findRecipientIds(admin, input.leadOwnerId ?? null)
  if (recipients.length === 0) return

  const dedupeKey = `customer-line-fallback-${input.customerId}`
  const brand = input.brandName.trim() || 'ลูกค้า'
  const title = `LINE OA: ${brand} ไม่ได้รับแจ้งอัตโนมัติ`
  const body = `${input.eventLabel} — ระบบส่ง LINE ไม่ได้ (${input.reason}). โปรดติดต่อมือ`
  const link = `/app/customers/${input.customerId}`

  for (const uid of recipients) {
    await admin
      .from('user_notifications')
      .upsert(
        {
          user_id: uid,
          dedupe_key: dedupeKey,
          title,
          body,
          link,
          severity: 'warn',
          read_at: null,
        },
        { onConflict: 'user_id,dedupe_key' },
      )
  }
}
