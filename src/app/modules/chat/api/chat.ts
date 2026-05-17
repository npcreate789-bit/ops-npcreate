import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { ChatMessage, ChatMessageInput } from '../types'

const MOCK_KEY = 'npcreate_chat_dev'

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

export async function ensureProjectChatRoom(projectId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    if (!loadMock()[projectId]) saveMock({ ...loadMock(), [projectId]: [] })
    return projectId
  }

  const { data, error } = await supabase.rpc('ensure_project_chat_room', {
    p_project_id: projectId,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function listChatMessages(roomId: string, projectIdForMock?: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) {
    const key = projectIdForMock ?? roomId
    return (loadMock()[key] ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, sender_id, body, created_task_id, created_at')
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
): Promise<ChatMessage> {
  const body = input.body.trim()
  if (!body) throw new Error('ข้อความว่าง')

  if (!isSupabaseConfigured || !supabase) {
    const key = projectIdForMock ?? input.room_id
    const store = loadMock()
    const row: ChatMessage = {
      id: crypto.randomUUID(),
      room_id: input.room_id,
      sender_id: input.sender_id,
      body,
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
    .select('id, room_id, sender_id, body, created_task_id, created_at')
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
