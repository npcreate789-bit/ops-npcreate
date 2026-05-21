import { invokeNotifyPaymentCustomerLine } from '../../finance/api/notifyPaymentCustomerLine'
import { invokeVerifyPaymentSlip } from '../../finance/api/paymentSlipVerify'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

const SLIP_MAX_BYTES = 10 * 1024 * 1024
const SLIP_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
])

const FALLBACK_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])

function isAcceptedFile(file: File): boolean {
  if (file.type && SLIP_MIME.has(file.type)) return true
  // กรณีบาง browser ส่ง type ว่าง — fallback ตามนามสกุล
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return true
  return FALLBACK_IMAGE_EXTS.has(ext) || file.type.startsWith('image/')
}

function mapStorageError(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes('exceeded') && msg.includes('size')) return 'ไฟล์ใหญ่เกินขนาดที่ระบบรองรับ'
  if (msg.includes('payload too large') || msg.includes('413'))
    return 'ไฟล์ใหญ่เกินขนาดที่ระบบรองรับ'
  if (msg.includes('mime') || msg.includes('content type') || msg.includes('invalid file type'))
    return 'รูปแบบไฟล์ไม่รองรับ — ลองใช้ JPG, PNG หรือ PDF'
  if (msg.includes('duplicate') || msg.includes('already exists') || msg.includes('conflict'))
    return 'ไฟล์ซ้ำกับที่อัปโหลดไปแล้ว — ลองเปลี่ยนชื่อไฟล์'
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout'))
    return 'การเชื่อมต่อมีปัญหา — ลองใหม่อีกครั้ง'
  if (msg.includes('row-level security') || msg.includes('permission') || msg.includes('jwt'))
    return 'ลิงก์หมดอายุหรือไม่ได้รับสิทธิ์ — กรุณารีเฟรชหน้านี้'
  return raw || 'อัปโหลดไม่สำเร็จ — กรุณาลองใหม่'
}

export async function uploadPublicPaymentSlip(
  token: string,
  file: File,
): Promise<{ paymentId: string }> {
  if (!token.trim()) {
    throw new Error('ลิงก์ไม่ถูกต้อง')
  }
  if (file.size === 0) {
    throw new Error('ไฟล์ว่าง — ลองเลือกไฟล์ใหม่')
  }
  if (!isAcceptedFile(file)) {
    throw new Error('รองรับเฉพาะรูปภาพ (JPG/PNG/WebP/HEIC) หรือ PDF')
  }
  if (file.size > SLIP_MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 10 MB — กรุณาบีบอัดหรือย่อรูปก่อน')
  }

  if (!isSupabaseConfigured || !supabase) {
    await new Promise((r) => setTimeout(r, 400))
    return { paymentId: 'mock-payment' }
  }

  const safeName = file.name.replace(/[^\w.\-ก-๙]+/gu, '_').slice(0, 80) || 'slip'
  const path = `public/${token}/${Date.now()}_${safeName}`

  const { error: upError } = await supabase.storage.from('payments').upload(path, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (upError) throw new Error(mapStorageError(upError.message))

  const { data, error } = await supabase.rpc('register_public_payment_slip', {
    p_token: token,
    p_storage_path: path,
  })
  if (error) throw new Error(mapStorageError(error.message))

  const row = data as { payment_id?: string } | null
  if (!row?.payment_id) {
    throw new Error('บันทึกสลิปไม่สำเร็จ')
  }

  void invokeNotifyPaymentCustomerLine(row.payment_id, 'slip_received', {
    publicToken: token,
  })
  void invokeVerifyPaymentSlip(row.payment_id, { publicToken: token })

  return { paymentId: row.payment_id }
}
