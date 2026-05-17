import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

const BUCKET = 'chat-attachments'
export const CHAT_FILE_MAX_BYTES = 50 * 1024 * 1024
const VOICE_SOFT_MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
  'video/webm',
  'video/mp4',
  'video/quicktime',
]

/** สำหรับ input[type=file] แนบทั่วไป */
export const CHAT_FILE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4a,.mp3,.wav,.ogg'

export const CHAT_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm'

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-ก-๙() ]+/gu, '_').slice(0, 120) || 'file'
}

export function isChatImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('image/'))
}

export function isChatAudioMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('audio/'))
}

export function isChatVideoMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('video/'))
}

export function chatMediaKind(
  mime: string | null | undefined,
): 'image' | 'audio' | 'video' | 'file' {
  if (isChatImageMime(mime)) return 'image'
  if (isChatAudioMime(mime)) return 'audio'
  if (isChatVideoMime(mime)) return 'video'
  return 'file'
}

export function validateChatFile(file: File): string | null {
  if (file.size > CHAT_FILE_MAX_BYTES) {
    return 'ไฟล์ใหญ่เกิน 50 MB'
  }
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return 'รองรับรูป, PDF, เสียง (WebM/MP3/M4A) หรือวิดีโอสั้น (MP4/MOV/WebM)'
  }
  if (isChatAudioMime(file.type) && file.size > VOICE_SOFT_MAX_BYTES) {
    return 'ไฟล์เสียงใหญ่เกิน 10 MB — ลองบันทึกใหม่สั้นลง'
  }
  return null
}

export async function uploadChatFile(
  projectId: string,
  roomId: string,
  file: File,
  caption?: string,
  replyToId?: string | null,
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
    p_reply_to_id: replyToId ?? null,
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

export function formatMediaByteSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
