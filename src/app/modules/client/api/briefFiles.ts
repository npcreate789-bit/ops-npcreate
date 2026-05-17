import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

const BUCKET = 'briefs'
const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
]

export interface BriefAttachment {
  id: string
  customer_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  byte_size: number | null
  uploaded_by: string
  created_at: string
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-ก-๙() ]+/gu, '_').slice(0, 120) || 'file'
}

export function validateBriefFile(file: File): string | null {
  if (file.size > MAX_BYTES) return 'ไฟล์ใหญ่เกิน 50 MB'
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return 'รองรับเฉพาะรูปภาพ, PDF, Excel หรือไฟล์ข้อความ'
  }
  return null
}

export async function listBriefAttachments(customerId: string): Promise<BriefAttachment[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('brief_attachments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as BriefAttachment[]
}

export async function uploadBriefFile(customerId: string, file: File): Promise<BriefAttachment> {
  const validation = validateBriefFile(file)
  if (validation) throw new Error(validation)

  if (!isSupabaseConfigured || !supabase) {
    return {
      id: crypto.randomUUID(),
      customer_id: customerId,
      storage_path: `${customerId}/${file.name}`,
      file_name: file.name,
      mime_type: file.type || null,
      byte_size: file.size,
      uploaded_by: 'local',
      created_at: new Date().toISOString(),
    }
  }

  const path = `${customerId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (uploadErr) throw new Error(uploadErr.message)

  const { data, error } = await supabase.rpc('register_brief_attachment', {
    p_storage_path: path,
    p_file_name: file.name,
    p_mime_type: file.type || null,
    p_byte_size: file.size,
  })

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }

  const { data: row, error: fetchErr } = await supabase
    .from('brief_attachments')
    .select('*')
    .eq('id', data as string)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)
  return row as BriefAttachment
}

export async function deleteBriefAttachment(row: BriefAttachment): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error: storageErr } = await supabase.storage.from(BUCKET).remove([row.storage_path])
  if (storageErr) throw new Error(storageErr.message)

  const { error } = await supabase.from('brief_attachments').delete().eq('id', row.id)
  if (error) throw new Error(error.message)
}

export async function getBriefFileUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
