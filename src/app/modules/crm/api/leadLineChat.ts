import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { resolveLeadLinePushRecipient } from '../../../../shared/line/resolveLeadLinePushRecipient'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'
import { getLeadFileUrl, uploadLeadFile } from './leads'
import { lineChatReplyMeta } from '../leadLineChatUtils'
import type { Lead } from '../types'
import type { LeadLineMessage } from '../types/leadLineChat'

export interface SendLeadLineChatInput {
  text?: string
  imageFile?: File
  replyTo?: LeadLineMessage | null
}

const LINE_IMAGE_MIME = /^image\/(jpeg|png|webp)$/i
const LINE_IMAGE_EXT = /\.(jpe?g|png|webp)$/i

function validateLineChatImage(file: File): string | null {
  if (file.size > 10 * 1024 * 1024) {
    return 'รูปใหญ่เกินไป (สูงสุด 10 MB)'
  }
  if (file.type && LINE_IMAGE_MIME.test(file.type)) return null
  if (LINE_IMAGE_EXT.test(file.name)) return null
  return 'รองรับเฉพาะรูป JPEG, PNG หรือ WebP'
}

export async function uploadLeadLineChatImage(
  lead: Pick<Lead, 'id' | 'owner_id'>,
  file: File,
): Promise<{ storagePath: string; signedUrl: string }> {
  const invalid = validateLineChatImage(file)
  if (invalid) throw new Error(invalid)

  const storagePath = await uploadLeadFile(lead.id, lead.owner_id, file)
  const signedUrl = await getLeadFileUrl(storagePath)
  if (!signedUrl) throw new Error('ไม่สามารถสร้างลิงก์รูปสำหรับส่ง LINE ได้')
  return { storagePath, signedUrl }
}

export async function listLeadLineMessages(leadId: string): Promise<LeadLineMessage[]> {
  if (!isSupabaseConfigured || !supabase) {
    const { mockLeadLineMessages } = await import('./mockLeadLineChat')
    return mockLeadLineMessages.list(leadId)
  }

  const { data, error } = await supabase
    .from('lead_line_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    ...(row as LeadLineMessage),
    metadata: ((row as LeadLineMessage).metadata as Record<string, unknown> | null) ?? {},
  }))
}

export async function sendLeadLineChatMessage(
  lead: Pick<Lead, 'id' | 'owner_id' | 'line_user_id' | 'line_oa_chat_user_id'>,
  input: SendLeadLineChatInput,
  senderProfileId?: string | null,
): Promise<void> {
  const text = input.text?.trim() ?? ''
  let imageUrl: string | undefined
  let storagePath: string | undefined

  if (input.imageFile) {
    const uploaded = await uploadLeadLineChatImage(lead, input.imageFile)
    imageUrl = uploaded.signedUrl
    storagePath = uploaded.storagePath
  }

  if (!text && !imageUrl) throw new Error('กรุณาพิมพ์ข้อความหรือแนบรูป')

  const to = await resolveLeadLinePushRecipient({
    id: lead.id,
    line_user_id: lead.line_user_id,
    line_oa_chat_user_id: lead.line_oa_chat_user_id,
  })
  if (!to) {
    throw new Error(
      'ยังไม่มี LINE User ID สำหรับส่งข้อความ — ให้ลูกค้าทัก OA หรือบันทึก ID จาก chat.line.biz (หลัง /chat/)',
    )
  }

  const replyMeta = input.replyTo ? lineChatReplyMeta(input.replyTo) : null
  const baseMetadata: Record<string, unknown> = replyMeta ? { ...replyMeta } : {}
  if (storagePath) baseMetadata.storage_path = storagePath

  if (!isSupabaseConfigured || !supabase) {
    const { mockLeadLineMessages } = await import('./mockLeadLineChat')
    if (imageUrl) {
      mockLeadLineMessages.append(lead.id, {
        line_user_id: to,
        direction: 'outbound',
        body: input.imageFile?.name?.trim() || '[รูปภาพ]',
        message_type: 'image',
        line_message_id: null,
        sender_profile_id: senderProfileId ?? null,
        metadata: { ...baseMetadata, image_url: imageUrl },
      })
    }
    if (text) {
      mockLeadLineMessages.append(lead.id, {
        line_user_id: to,
        direction: 'outbound',
        body: text,
        message_type: 'text',
        line_message_id: null,
        sender_profile_id: senderProfileId ?? null,
        metadata: imageUrl ? baseMetadata : { ...baseMetadata },
      })
    }
    return
  }

  const { data, error } = await supabase.functions.invoke('send-line-push', {
    body: {
      to,
      text: text || undefined,
      image_url: imageUrl,
      lead_id: lead.id,
      metadata: baseMetadata,
      storage_path: storagePath,
      image_name: input.imageFile?.name,
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    throw new Error(message)
  }

  const result = data as { ok?: boolean; error?: string } | null
  if (result?.error) throw new Error(result.error)
}
