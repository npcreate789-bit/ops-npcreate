import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

const BUCKET = 'chat-attachments'
const MAX_BYTES = 25 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-ก-๙() ]+/gu, '_').slice(0, 120) || 'file'
}

export function validateChatFile(file: File): string | null {
  if (file.size > MAX_BYTES) return 'ไฟล์ใหญ่เกิน 25 MB'
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return 'รองรับเฉพาะรูปภาพ (JPG, PNG, WebP, GIF) หรือ PDF'
  }
  return null
}

export async function uploadChatFile(
  projectId: string,
  roomId: string,
  file: File,
  caption?: string,
): Promise<string> {
  const validation = validateChatFile(file)
  if (validation) throw new Error(validation)

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('อัปโหลดไฟล์ต้องเชื่อมต่อ Supabase')
  }

  const path = `${projectId}/${roomId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (uploadErr) throw new Error(uploadErr.message)

  const { data, error } = await supabase.rpc('send_chat_file_message', {
    p_room_id: roomId,
    p_storage_path: path,
    p_file_name: file.name,
    p_mime_type: file.type || null,
    p_byte_size: file.size,
    p_caption: caption?.trim() || null,
  })

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }

  return data as string
}

export async function getChatAttachmentUrl(storagePath: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !storagePath) return null

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error) throw new Error(error.message)
  return data.signedUrl
}

export function isChatImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('image/'))
}
