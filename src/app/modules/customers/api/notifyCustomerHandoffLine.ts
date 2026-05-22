import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

/**
 * เรียก Edge `notify-customer-handoff-line` ส่งข้อความ "ขอบคุณ + ลิงก์ Client Workspace"
 * ผ่าน LINE OA เมื่อ Lead กลายเป็น Customer สำเร็จ
 *
 * Idempotent — server จะ dedupe ตาม `customer_id` ใน lead_line_messages
 * (เรียกซ้ำได้ปลอดภัย ทั้งจาก save flow และ payment confirmation cascade)
 *
 * ออกแบบให้ "fire-and-forget" — ถ้าล้มเหลวจะไม่ตอบให้ผู้ใช้รับรู้
 * เพราะแชทเป็นเรื่องแยกจากธุรกรรมหลัก
 */
export interface CustomerHandoffLineResult {
  ok: boolean
  skipped?: string
  pushed?: boolean
  error?: string
}

export async function invokeNotifyCustomerHandoffLine(
  customerId: string,
): Promise<CustomerHandoffLineResult> {
  const id = customerId?.trim()
  if (!id || !isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'offline' }
  }

  const { data, error } = await supabase.functions.invoke('notify-customer-handoff-line', {
    body: { customer_id: id },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const body = (data ?? {}) as {
    ok?: boolean
    skipped?: string
    pushed?: boolean
    error?: string
  }

  if (body.error) {
    return { ok: false, error: body.error }
  }

  return {
    ok: body.ok !== false,
    skipped: typeof body.skipped === 'string' ? body.skipped : undefined,
    pushed: body.pushed === true,
  }
}
