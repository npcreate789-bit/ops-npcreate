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
}
