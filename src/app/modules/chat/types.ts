export type ChatMessageType = 'text' | 'system' | 'file'

export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  body: string
  message_type: ChatMessageType
  attachment_path: string | null
  attachment_name: string | null
  attachment_mime: string | null
  attachment_size: number | null
  created_task_id: string | null
  created_at: string
  sender_name?: string | null
}

export interface ChatMessageInput {
  room_id: string
  sender_id: string
  body: string
}

export interface ChatInboxItem {
  room_id: string
  project_id: string
  project_name: string
  customer_id: string
  brand_name: string
  last_message_body: string | null
  last_message_at: string | null
  last_sender_id: string | null
  unread_count: number
}
