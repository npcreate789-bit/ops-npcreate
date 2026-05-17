import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type {
  ChatMentionCandidate,
  ChatMessageNote,
  ChatMessageTemplate,
  ChatNotesMap,
  ChatPinnedMessage,
  ChatReactionEmoji,
  ChatReadReceipt,
  ChatReactionsMap,
  ChatRoomSocialState,
} from '../types'
import { CHAT_REACTION_EMOJIS } from '../types'

const MOCK_TEMPLATES_KEY = 'npcreate_chat_templates_dev'
const MOCK_PINS_KEY = 'npcreate_chat_pins_dev'
const MOCK_REACTIONS_KEY = 'npcreate_chat_reactions_dev'
const MOCK_NOTES_KEY = 'npcreate_chat_notes_dev'

const DEFAULT_TEMPLATES: ChatMessageTemplate[] = [
  {
    id: 'tpl-1',
    label: 'ทักทายลูกค้า',
    body: 'สวัสดีครับ/ค่ะ ทีม NP Create พร้อมช่วยเหลือครับ',
    sort_order: 10,
    is_active: true,
  },
  {
    id: 'tpl-2',
    label: 'รับทราบ',
    body: 'รับทราบครับ จะดำเนินการให้ทันที',
    sort_order: 20,
    is_active: true,
  },
]

function parseJsonArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  return []
}

function parseReactionsMap(data: unknown): ChatReactionsMap {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as ChatReactionsMap
  }
  return {}
}

function parseNotesMap(data: unknown): ChatNotesMap {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }
  const raw = data as Record<string, unknown>
  const out: ChatNotesMap = {}
  for (const [messageId, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      out[messageId] = value as ChatMessageNote[]
    }
  }
  return out
}

export async function listChatMentionCandidates(
  projectId: string,
): Promise<ChatMentionCandidate[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      {
        user_id: '00000000-0000-4000-8000-000000000002',
        login_id: 'sales',
        full_name: 'Sales Demo',
        role_hint: 'Sales',
      },
      {
        user_id: '00000000-0000-4000-8000-000000000003',
        login_id: 'ads',
        full_name: 'Ads Demo',
        role_hint: 'Ads',
      },
    ]
  }

  const { data, error } = await supabase.rpc('list_chat_mention_candidates', {
    p_project_id: projectId,
  })
  if (error) throw new Error(error.message)
  return parseJsonArray<ChatMentionCandidate>(data)
}

export async function fetchChatRoomSocial(roomId: string): Promise<ChatRoomSocialState> {
  if (!isSupabaseConfigured || !supabase) {
    return loadMockSocial(roomId)
  }

  const [reads, pinned, reactions, notes] = await Promise.all([
    supabase.rpc('get_chat_read_receipts', { p_room_id: roomId }),
    supabase.rpc('list_chat_pinned_messages', { p_room_id: roomId }),
    supabase.rpc('list_chat_room_reactions', { p_room_id: roomId }),
    supabase.rpc('list_chat_room_notes', { p_room_id: roomId }),
  ])

  if (reads.error) throw new Error(reads.error.message)
  if (pinned.error) throw new Error(pinned.error.message)
  if (reactions.error) throw new Error(reactions.error.message)
  if (notes.error) throw new Error(notes.error.message)

  return {
    readReceipts: parseJsonArray<ChatReadReceipt>(reads.data),
    pinned: parseJsonArray<ChatPinnedMessage>(pinned.data),
    reactions: parseReactionsMap(reactions.data),
    notes: parseNotesMap(notes.data),
  }
}

export async function saveChatMessageNote(
  messageId: string,
  body: string,
): Promise<ChatMessageNote> {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('โน้ตว่าง')

  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockNotes()
    const row: ChatMessageNote = {
      id: crypto.randomUUID(),
      message_id: messageId,
      author_id: 'dev-me',
      author_name: 'คุณ (Dev)',
      body: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const list = store[messageId] ?? []
    store[messageId] = [...list, row]
    saveMockNotes(store)
    return row
  }

  const { data, error } = await supabase.rpc('save_chat_message_note', {
    p_message_id: messageId,
    p_body: trimmed,
  })
  if (error) throw new Error(error.message)
  return data as ChatMessageNote
}

export async function deleteChatMessageNote(noteId: string, messageId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockNotes()
    store[messageId] = (store[messageId] ?? []).filter((n) => n.id !== noteId)
    saveMockNotes(store)
    return
  }

  const { error } = await supabase.rpc('delete_chat_message_note', { p_note_id: noteId })
  if (error) throw new Error(error.message)
}

export async function pinChatMessage(roomId: string, messageId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockPins()
    const list = store[roomId] ?? []
    if (!list.some((p) => p.message_id === messageId)) {
      list.unshift({
        pin_id: crypto.randomUUID(),
        message_id: messageId,
        body: '',
        message_type: 'text',
        pinned_at: new Date().toISOString(),
        pinned_by_name: 'คุณ',
      })
    }
    store[roomId] = list
    saveMockPins(store)
    return
  }

  const { error } = await supabase.rpc('pin_chat_message', {
    p_room_id: roomId,
    p_message_id: messageId,
  })
  if (error) throw new Error(error.message)
}

export async function unpinChatMessage(roomId: string, messageId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockPins()
    store[roomId] = (store[roomId] ?? []).filter((p) => p.message_id !== messageId)
    saveMockPins(store)
    return
  }

  const { error } = await supabase.rpc('unpin_chat_message', {
    p_room_id: roomId,
    p_message_id: messageId,
  })
  if (error) throw new Error(error.message)
}

export async function toggleChatReaction(
  messageId: string,
  emoji: ChatReactionEmoji,
): Promise<boolean> {
  if (!CHAT_REACTION_EMOJIS.includes(emoji)) {
    throw new Error('emoji ไม่รองรับ')
  }

  if (!isSupabaseConfigured || !supabase) {
    const store = loadMockReactions()
    const list = store[messageId] ?? []
    const idx = list.findIndex((r) => r.emoji === emoji && r.user_id === 'dev-me')
    if (idx >= 0) {
      list.splice(idx, 1)
      store[messageId] = list
      saveMockReactions(store)
      return false
    }
    list.push({
      emoji,
      user_id: 'dev-me',
      login_id: 'me',
      full_name: 'คุณ',
    })
    store[messageId] = list
    saveMockReactions(store)
    return true
  }

  const { data, error } = await supabase.rpc('toggle_chat_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

export async function listChatMessageTemplates(): Promise<ChatMessageTemplate[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadMockTemplates()
  }

  const { data, error } = await supabase.rpc('list_chat_message_templates')
  if (error) throw new Error(error.message)
  return parseJsonArray<ChatMessageTemplate>(data)
}

export async function upsertChatMessageTemplate(input: {
  id?: string
  label: string
  body: string
  sort_order: number
  is_active: boolean
}): Promise<ChatMessageTemplate> {
  if (!isSupabaseConfigured || !supabase) {
    const list = loadMockTemplates()
    if (input.id) {
      const idx = list.findIndex((t) => t.id === input.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...input, id: input.id }
        saveMockTemplates(list)
        return list[idx]
      }
    }
    const row: ChatMessageTemplate = {
      id: crypto.randomUUID(),
      label: input.label,
      body: input.body,
      sort_order: input.sort_order,
      is_active: input.is_active,
    }
    list.push(row)
    saveMockTemplates(list)
    return row
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('chat_message_templates')
      .update({
        label: input.label,
        body: input.body,
        sort_order: input.sort_order,
        is_active: input.is_active,
      })
      .eq('id', input.id)
      .select('id, label, body, sort_order, is_active')
      .single()
    if (error) throw new Error(error.message)
    return data as ChatMessageTemplate
  }

  const { data, error } = await supabase
    .from('chat_message_templates')
    .insert({
      label: input.label,
      body: input.body,
      sort_order: input.sort_order,
      is_active: input.is_active,
    })
    .select('id, label, body, sort_order, is_active')
    .single()
  if (error) throw new Error(error.message)
  return data as ChatMessageTemplate
}

export async function deleteChatMessageTemplate(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    saveMockTemplates(loadMockTemplates().filter((t) => t.id !== id))
    return
  }

  const { error } = await supabase.from('chat_message_templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listChatMessageTemplatesAdmin(): Promise<ChatMessageTemplate[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadMockTemplates()
  }

  const { data, error } = await supabase
    .from('chat_message_templates')
    .select('id, label, body, sort_order, is_active')
    .order('sort_order')
    .order('label')

  if (error) throw new Error(error.message)
  return (data ?? []) as ChatMessageTemplate[]
}

function loadMockTemplates(): ChatMessageTemplate[] {
  try {
    const raw = localStorage.getItem(MOCK_TEMPLATES_KEY)
    return raw ? (JSON.parse(raw) as ChatMessageTemplate[]) : [...DEFAULT_TEMPLATES]
  } catch {
    return [...DEFAULT_TEMPLATES]
  }
}

function saveMockTemplates(rows: ChatMessageTemplate[]) {
  localStorage.setItem(MOCK_TEMPLATES_KEY, JSON.stringify(rows))
}

function loadMockPins(): Record<string, ChatPinnedMessage[]> {
  try {
    const raw = localStorage.getItem(MOCK_PINS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ChatPinnedMessage[]>) : {}
  } catch {
    return {}
  }
}

function saveMockPins(store: Record<string, ChatPinnedMessage[]>) {
  localStorage.setItem(MOCK_PINS_KEY, JSON.stringify(store))
}

function loadMockReactions(): ChatReactionsMap {
  try {
    const raw = localStorage.getItem(MOCK_REACTIONS_KEY)
    return raw ? (JSON.parse(raw) as ChatReactionsMap) : {}
  } catch {
    return {}
  }
}

function saveMockReactions(store: ChatReactionsMap) {
  localStorage.setItem(MOCK_REACTIONS_KEY, JSON.stringify(store))
}

function loadMockNotes(): ChatNotesMap {
  try {
    const raw = localStorage.getItem(MOCK_NOTES_KEY)
    return raw ? (JSON.parse(raw) as ChatNotesMap) : {}
  } catch {
    return {}
  }
}

function saveMockNotes(store: ChatNotesMap) {
  localStorage.setItem(MOCK_NOTES_KEY, JSON.stringify(store))
}

function loadMockSocial(roomId: string): ChatRoomSocialState {
  return {
    readReceipts: [],
    pinned: loadMockPins()[roomId] ?? [],
    reactions: loadMockReactions(),
    notes: loadMockNotes(),
  }
}
