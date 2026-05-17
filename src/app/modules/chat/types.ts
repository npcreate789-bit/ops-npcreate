export interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  body: string
  created_task_id: string | null
  created_at: string
  sender_name?: string | null
}

export interface ChatMessageInput {
  room_id: string
  sender_id: string
  body: string
}
