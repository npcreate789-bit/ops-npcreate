import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

const SLIP_MAX_BYTES = 10 * 1024 * 1024
const SLIP_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

export async function uploadPublicPaymentSlip(
  token: string,
  file: File,
): Promise<{ paymentId: string }> {
  if (!token.trim()) {
    throw new Error('ลิงก์ไม่ถูกต้อง')
  }
  if (!SLIP_MIME.has(file.type)) {
    throw new Error('รองรับเฉพาะ JPG, PNG, WebP หรือ PDF')
  }
  if (file.size > SLIP_MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 10 MB')
  }

  if (!isSupabaseConfigured || !supabase) {
    await new Promise((r) => setTimeout(r, 400))
    return { paymentId: 'mock-payment' }
  }

  const safeName = file.name.replace(/[^\w.\-ก-๙]+/gu, '_').slice(0, 80) || 'slip'
  const path = `public/${token}/${Date.now()}_${safeName}`

  const { error: upError } = await supabase.storage.from('payments').upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (upError) throw new Error(upError.message)

  const { data, error } = await supabase.rpc('register_public_payment_slip', {
    p_token: token,
    p_storage_path: path,
  })
  if (error) throw new Error(error.message)

  const row = data as { payment_id?: string } | null
  if (!row?.payment_id) {
    throw new Error('บันทึกสลิปไม่สำเร็จ')
  }
  return { paymentId: row.payment_id }
}
