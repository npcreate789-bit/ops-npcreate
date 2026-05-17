import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseChatChannel, type ChatChannelKey } from '../constants/channels'
import type { ChatChannelTab, ChatInboxItem, ChatMessage, ChatMessageInput } from '../types'

const MESSAGE_SELECT =
  'id, room_id, sender_id, body, message_type, attachment_path, attachment_name, attachment_mime, attachment_size, created_task_id, created_at'

const MOCK_KEY = 'npcreate_chat_dev'
const MOCK_READS_KEY = 'npcreate_chat_reads_dev'

type MockStore = Record<string, ChatMessage[]>

function loadMock(): MockStore {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    return raw ? (JSON.parse(raw) as MockStore) : {}
  } catch {
    return {}
  }
}

function saveMock(store: MockStore) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(store))
}

function mapMessage(row: Record<string, unknown>, senderName?: string | null): ChatMessage {
  return {
    id: row.id as string,
    room_id: row.room_id as string,
    sender_id: row.sender_id as string,
    body: row.body as string,
    message_type: (row.message_type as ChatMessage['message_type']) ?? 'text',
    attachment_path: (row.attachment_path as string) ?? null,
    attachment_name: (row.attachment_name as string) ?? null,
    attachment_mime: (row.attachment_mime as string) ?? null,
    attachment_size: row.attachment_size != null ? Number(row.attachment_size) : null,
    created_task_id: (row.created_task_id as string) ?? null,
    created_at: row.created_at as string,
    sender_name: senderName ?? null,
  }
}

async function senderName(id: string): Promise<string | null> {
  if (!supabase) return 'ผู้ใช้'
  const { data } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return (data.full_name as string | null) || (data.email as string)
}

function mockStoreKey(projectId: string, channel: ChatChannelKey): string {
  return `${projectId}::${channel}`
}

export async function ensureProjectChatChannel(
  projectId: string,
  channel: ChatChannelKey = 'client',
): Promise<string> {
  const ch = parseChatChannel(channel)

  if (!isSupabaseConfigured || !supabase) {
    const key = mockStoreKey(projectId, ch)
    if (!loadMock()[key]) saveMock({ ...loadMock(), [key]: [] })
    return key
  }

  const { data, error } = await supabase.rpc('ensure_project_chat_channel', {
    p_project_id: projectId,
    p_channel: ch,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function ensureProjectChatRoom(projectId: string): Promise<string> {
  return ensureProjectChatChannel(projectId, 'client')
}

export async function listProjectChatChannels(projectId: string): Promise<ChatChannelTab[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      { channel: 'client', room_id: mockStoreKey(projectId, 'client'), label: 'ลูกค้า' },
      { channel: 'account', room_id: mockStoreKey(projectId, 'account'), label: 'Account' },
      { channel: 'ads', room_id: mockStoreKey(projectId, 'ads'), label: 'Ads' },
      { channel: 'sales', room_id: mockStoreKey(projectId, 'sales'), label: 'Sales' },
    ]
  }

  const { data, error } = await supabase.rpc('list_project_chat_channels', {
    p_project_id: projectId,
  })
  if (error) throw new Error(error.message)
  const rows = Array.isArray(data) ? data : []
  return rows.map((row) => {
    const r = row as Record<string, unknown>
    const channel = parseChatChannel(r.channel as string)
    return {
      channel,
      room_id: r.room_id as string,
      label: (r.label as string) ?? channel,
    }
  })
}

export async function listChatMessages(
  roomId: string,
  projectIdForMock?: string,
  channelForMock?: ChatChannelKey,
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) {
    const key =
      projectIdForMock && channelForMock
        ? mockStoreKey(projectIdForMock, channelForMock)
        : (projectIdForMock ?? roomId)
    return (loadMock()[key] ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const names = new Map<string, string | null>()
  for (const row of rows) {
    const sid = row.sender_id as string
    if (!names.has(sid)) names.set(sid, await senderName(sid))
  }

  return rows.map((r) =>
    mapMessage(r as Record<string, unknown>, names.get((r as { sender_id: string }).sender_id)),
  )
}

export async function sendChatMessage(
  input: ChatMessageInput,
  projectIdForMock?: string,
  channelForMock?: ChatChannelKey,
): Promise<ChatMessage> {
  const body = input.body.trim()
  if (!body) throw new Error('ข้อความว่าง')

  if (!isSupabaseConfigured || !supabase) {
    const key =
      projectIdForMock && channelForMock
        ? mockStoreKey(projectIdForMock, channelForMock)
        : (projectIdForMock ?? input.room_id)
    const store = loadMock()
    const row: ChatMessage = {
      id: crypto.randomUUID(),
      room_id: input.room_id,
      sender_id: input.sender_id,
      body,
      message_type: 'text',
      attachment_path: null,
      attachment_name: null,
      attachment_mime: null,
      attachment_size: null,
      created_task_id: null,
      created_at: new Date().toISOString(),
      sender_name: 'คุณ (Dev)',
    }
    store[key] = [...(store[key] ?? []), row]
    saveMock(store)
    return row
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: input.room_id,
      sender_id: input.sender_id,
      body,
    })
    .select(MESSAGE_SELECT)
    .single()

  if (error) throw new Error(error.message)
  const name = await senderName(input.sender_id)
  return mapMessage(data as Record<string, unknown>, name)
}

export async function linkChatMessageToTask(messageId: string, taskId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase
    .from('chat_messages')
    .update({ created_task_id: taskId })
    .eq('id', messageId)
  if (error) throw new Error(error.message)
}

export async function insertChatSystemMessage(
  roomId: string,
  body: string,
  taskId?: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.rpc('insert_chat_system_message', {
    p_room_id: roomId,
    p_body: body.trim(),
    p_created_task_id: taskId ?? null,
  })
  if (error) throw new Error(error.message)
}

function loadMockReads(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MOCK_READS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function saveMockReads(reads: Record<string, string>) {
  localStorage.setItem(MOCK_READS_KEY, JSON.stringify(reads))
}

export async function markChatRoomRead(roomId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const reads = loadMockReads()
    reads[roomId] = new Date().toISOString()
    saveMockReads(reads)
    return
  }

  const { error } = await supabase.rpc('mark_chat_room_read', { p_room_id: roomId })
  if (error) throw new Error(error.message)
}

function mockUnreadCount(roomKey: string, userId: string): number {
  const messages = loadMock()[roomKey] ?? []
  const lastRead = loadMockReads()[roomKey]
  const since = lastRead ? new Date(lastRead).getTime() : 0
  return messages.filter(
    (m) =>
      m.message_type !== 'system' &&
      m.sender_id !== userId &&
      new Date(m.created_at).getTime() > since,
  ).length
}

export async function listChatInbox(userId: string): Promise<ChatInboxItem[]> {
  if (!isSupabaseConfigured || !supabase) {
    const store = loadMock()
    const channels: ChatChannelKey[] = ['client', 'account', 'ads', 'sales']
    const labels: Record<ChatChannelKey, string> = {
      client: 'ลูกค้า',
      account: 'Account',
      ads: 'Ads',
      sales: 'Sales',
    }
    const projectId = 'demo-project'
    for (const ch of channels) {
      const mk = mockStoreKey(projectId, ch)
      if (!store[mk]) {
        saveMock({ ...store, [mk]: [] })
      }
    }
    return channels.map((ch) => {
      const mk = mockStoreKey(projectId, ch)
      const messages = loadMock()[mk] ?? []
      const last = messages[messages.length - 1]
      return {
        room_id: mk,
        project_id: projectId,
        project_name: 'โปรเจกต์ Demo',
        customer_id: '',
        brand_name: 'แบรนด์ Demo',
        channel: ch,
        channel_label: labels[ch],
        last_message_body: last?.body ?? null,
        last_message_at: last?.created_at ?? null,
        last_sender_id: last?.sender_id ?? null,
        unread_count: mockUnreadCount(mk, userId),
      }
    })
  }

  const { data, error } = await supabase.rpc('list_my_chat_inbox')
  if (error) throw new Error(error.message)
  if (Array.isArray(data)) return data as ChatInboxItem[]
  if (data && typeof data === 'object') return data as ChatInboxItem[]
  return []
}
