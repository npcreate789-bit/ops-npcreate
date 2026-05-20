export type LeadLineMessageDirection = 'inbound' | 'outbound'

export interface LeadLineMessage {
  id: string
  lead_id: string
  line_user_id: string
  direction: LeadLineMessageDirection
  body: string
  message_type: string
  line_message_id: string | null
  sender_profile_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

/** ข้อความหลัง enrich สำหรับแสดง reply แบบ LINE OA */
export interface LeadLineMessageView extends LeadLineMessage {
  reply_to_id?: string
  reply_to_from?: LeadLineMessageDirection
  reply_to_body?: string
  reply_to_message_type?: string
}
