import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { isLineSnippetCurrentlyValid } from '../lineSnippetSchedule'
import type { LineMessageSnippet, LineSnippetInput } from '../types/lineSnippets'

function mapRow(row: Record<string, unknown>): LineMessageSnippet {
  return {
    id: row.id as string,
    package_code: (row.package_code as string | null) ?? null,
    category: row.category as LineMessageSnippet['category'],
    title: row.title as string,
    body: row.body as string,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
    valid_from: (row.valid_from as string | null) ?? null,
    valid_until: (row.valid_until as string | null) ?? null,
    use_count: Number(row.use_count ?? 0),
    last_used_at: (row.last_used_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

const MOCK_SNIPPETS: LineMessageSnippet[] = [
  {
    id: 'mock-general-1',
    package_code: null,
    category: 'general',
    title: 'ทักทายครั้งแรก',
    body: 'สวัสดีครับ/ค่ะ จากทีม NP Create ขอบคุณที่สนใจบริการของเรานะครับ/คะ',
    sort_order: 10,
    is_active: true,
    valid_from: null,
    valid_until: null,
    use_count: 3,
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-gmv-1',
    package_code: 'gmv_max',
    category: 'service_intro',
    title: 'แนะนำ GMV Max',
    body: 'สวัสดีครับ/ค่ะ สำหรับบริการดูแล GMV Max ทีมจะช่วยวางแผน ยิงแอด และรายงานผลให้ครับ/คะ',
    sort_order: 10,
    is_active: true,
    valid_from: null,
    valid_until: null,
    use_count: 12,
    last_used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function sortSnippets(rows: LineMessageSnippet[]): LineMessageSnippet[] {
  return [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'th'),
  )
}

export interface ListLineSnippetsOptions {
  /** เฉพาะ is_active = true */
  activeOnly?: boolean
  /** เฉพาะอยู่ในช่วงวันที่และเปิดใช้งาน (สำหรับแชท CRM) */
  currentlyValid?: boolean
  /** เรียงตามจำนวนใช้ (มากสุดก่อน) */
  sortByUsage?: boolean
}

export async function listLineSnippets(
  options: ListLineSnippetsOptions = {},
): Promise<LineMessageSnippet[]> {
  const { activeOnly = false, currentlyValid = false, sortByUsage = false } = options

  if (!isSupabaseConfigured || !supabase) {
    let rows = [...MOCK_SNIPPETS]
    if (activeOnly) rows = rows.filter((r) => r.is_active)
    if (currentlyValid) rows = rows.filter((r) => isLineSnippetCurrentlyValid(r))
    return sortSnippets(rows)
  }

  let query = supabase
    .from('line_message_snippets')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
  if (currentlyValid) rows = rows.filter((r) => isLineSnippetCurrentlyValid(r))
  if (sortByUsage) {
    return [...rows].sort((a, b) => {
      if (b.use_count !== a.use_count) return b.use_count - a.use_count
      const bLast = b.last_used_at ? new Date(b.last_used_at).getTime() : 0
      const aLast = a.last_used_at ? new Date(a.last_used_at).getTime() : 0
      if (bLast !== aLast) return bLast - aLast
      return a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'th')
    })
  }
  return sortSnippets(rows)
}

/** บันทึกเมื่อทีมเลือกข้อความจากแชท CRM (ไม่บล็อก UI หากล้มเหลว) */
export async function recordLineSnippetUse(snippetId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const row = MOCK_SNIPPETS.find((s) => s.id === snippetId)
    if (row) {
      row.use_count += 1
      row.last_used_at = new Date().toISOString()
    }
    return
  }

  const { error } = await supabase.rpc('record_line_snippet_use', {
    p_snippet_id: snippetId,
  })
  if (error) throw new Error(error.message)
}

export async function getLineSnippet(id: string): Promise<LineMessageSnippet | null> {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_SNIPPETS.find((s) => s.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('line_message_snippets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapRow(data) : null
}

function toDbPayload(input: LineSnippetInput): Record<string, unknown> {
  return {
    package_code: input.package_code,
    category: input.category,
    title: input.title.trim(),
    body: input.body.trim(),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
    valid_from: input.valid_from || null,
    valid_until: input.valid_until || null,
  }
}

export async function createLineSnippet(input: LineSnippetInput): Promise<LineMessageSnippet> {
  if (!isSupabaseConfigured || !supabase) {
    const row: LineMessageSnippet = {
      id: `mock-${Date.now()}`,
      package_code: input.package_code,
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
      valid_from: input.valid_from ?? null,
      valid_until: input.valid_until ?? null,
      use_count: 0,
      last_used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    MOCK_SNIPPETS.push(row)
    return row
  }

  const { data, error } = await supabase
    .from('line_message_snippets')
    .insert(toDbPayload(input))
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function updateLineSnippet(
  id: string,
  input: Partial<LineSnippetInput>,
): Promise<LineMessageSnippet> {
  if (!isSupabaseConfigured || !supabase) {
    const idx = MOCK_SNIPPETS.findIndex((s) => s.id === id)
    if (idx < 0) throw new Error('ไม่พบข้อความ')
    const prev = MOCK_SNIPPETS[idx]
    const next = {
      ...prev,
      package_code: input.package_code !== undefined ? input.package_code : prev.package_code,
      category: input.category ?? prev.category,
      title: input.title?.trim() ?? prev.title,
      body: input.body?.trim() ?? prev.body,
      sort_order: input.sort_order ?? prev.sort_order,
      is_active: input.is_active ?? prev.is_active,
      valid_from: input.valid_from !== undefined ? input.valid_from : prev.valid_from,
      valid_until: input.valid_until !== undefined ? input.valid_until : prev.valid_until,
      updated_at: new Date().toISOString(),
    }
    MOCK_SNIPPETS[idx] = next
    return next
  }

  const patch: Record<string, unknown> = {}
  if (input.package_code !== undefined) patch.package_code = input.package_code
  if (input.category !== undefined) patch.category = input.category
  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.body !== undefined) patch.body = input.body.trim()
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order
  if (input.is_active !== undefined) patch.is_active = input.is_active
  if (input.valid_from !== undefined) patch.valid_from = input.valid_from || null
  if (input.valid_until !== undefined) patch.valid_until = input.valid_until || null

  const { data, error } = await supabase
    .from('line_message_snippets')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data)
}

export async function deleteLineSnippet(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const idx = MOCK_SNIPPETS.findIndex((s) => s.id === id)
    if (idx >= 0) MOCK_SNIPPETS.splice(idx, 1)
    return
  }

  const { error } = await supabase.from('line_message_snippets').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
