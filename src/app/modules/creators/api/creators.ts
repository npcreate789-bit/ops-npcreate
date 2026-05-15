import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { Creator, CreatorFilters, CreatorInput } from '../types'
import { mockCreatorsApi } from './mockStore'

function mapRow(row: Record<string, unknown>): Creator {
  return {
    id: row.id as string,
    display_name: row.display_name as string,
    tiktok_handle: (row.tiktok_handle as string | null) ?? null,
    line_id: (row.line_id as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    niche: (row.niche as string | null) ?? null,
    rate_per_clip: row.rate_per_clip != null ? Number(row.rate_per_clip) : null,
    status: row.status as Creator['status'],
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listCreators(filters: CreatorFilters): Promise<Creator[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockCreatorsApi.list(filters)
  }

  let query = supabase.from('creators').select('*').order('display_name')
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []).map(mapRow)
  const q = filters.search?.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (r) =>
        r.display_name.toLowerCase().includes(q) ||
        (r.tiktok_handle?.toLowerCase().includes(q) ?? false) ||
        (r.niche?.toLowerCase().includes(q) ?? false),
    )
  }
  return rows
}

export async function getCreator(id: string): Promise<Creator | null> {
  if (!isSupabaseConfigured || !supabase) return mockCreatorsApi.get(id)

  const { data, error } = await supabase.from('creators').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapRow(data) : null
}

export async function createCreator(input: CreatorInput): Promise<Creator> {
  if (!isSupabaseConfigured || !supabase) return mockCreatorsApi.create(input)

  const { data, error } = await supabase.from('creators').insert(input).select('*').single()
  if (error) throw new Error(error.message)
  await logAudit('creator.create', 'creator', data.id as string)
  return mapRow(data)
}

export async function updateCreator(id: string, input: CreatorInput): Promise<Creator> {
  if (!isSupabaseConfigured || !supabase) return mockCreatorsApi.update(id, input)

  const { display_name, tiktok_handle, line_id, phone, niche, rate_per_clip, status, notes } =
    input
  const { data, error } = await supabase
    .from('creators')
    .update({
      display_name,
      tiktok_handle,
      line_id,
      phone,
      niche,
      rate_per_clip,
      status,
      notes,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  await logAudit('creator.update', 'creator', id)
  return mapRow(data)
}

export async function deleteCreator(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockCreatorsApi.remove(id)
    return
  }

  const { error } = await supabase.from('creators').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit('creator.delete', 'creator', id)
}
