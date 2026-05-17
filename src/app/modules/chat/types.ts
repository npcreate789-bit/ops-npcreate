export type ChatMessageType = 'text' | 'system' | 'file'

export type ChatReactionEmoji = '👍' | '✅' | '❤️' | '😂' | '🙏'

export const CHAT_REACTION_EMOJIS: ChatReactionEmoji[] = ['👍', '✅', '❤️', '😂', '🙏']

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
  sender_login?: string | null
}

export interface ChatMessageInput {
  room_id: string
  sender_id: string
  body: string
}

import type { ChatChannelKey } from './constants/channels'

export type { ChatChannelKey }

export interface ChatInboxItem {
  room_id: string
  project_id: string
  project_name: string
  customer_id: string
  brand_name: string
  channel: ChatChannelKey
  channel_label: string
  last_message_body: string | null
  last_message_at: string | null
  last_sender_id: string | null
  unread_count: number
}

export interface ChatChannelTab {
  channel: ChatChannelKey
  room_id: string
  label: string
}

export interface ChatMentionCandidate {
  user_id: string
  login_id: string
  full_name: string
  role_hint: string
}

export interface ChatReadReceipt {
  user_id: string
  login_id: string | null
  full_name: string
  last_read_at: string
}

export interface ChatPinnedMessage {
  pin_id: string
  message_id: string
  body: string
  message_type: ChatMessageType
  pinned_at: string
  pinned_by_name: string | null
}

export interface ChatReactionEntry {
  emoji: ChatReactionEmoji
  user_id: string
  login_id: string | null
  full_name: string
}

export type ChatReactionsMap = Record<string, ChatReactionEntry[]>

export interface ChatMessageTemplate {
  id: string
  label: string
  body: string
  sort_order: number
  is_active: boolean
}

export interface ChatRoomSocialState {
  readReceipts: ChatReadReceipt[]
  pinned: ChatPinnedMessage[]
  reactions: ChatReactionsMap
}
