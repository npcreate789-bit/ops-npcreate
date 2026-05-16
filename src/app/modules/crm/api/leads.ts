import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type {
  Lead,
  LeadFilters,
  LeadInsert,
  LeadUpdate,
  SalesSummaryRow,
} from '../types'
import { ACTIVE_STATUSES } from '../constants'
import { validateLeadUploadFile } from '../leadFiles'
import { mockLeadsApi } from './mockStore'

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockLeadsApi.list(filters)
  }

  let query = supabase.from('leads').select('*').order('updated_at', { ascending: false })

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters.channel && filters.channel !== 'all') {
    query = query.eq('channel', filters.channel)
  }
  if (filters.ownerId) {
    query = query.eq('owner_id', filters.ownerId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  let rows = (data ?? []) as Lead[]
  if (filters.search) {
    const q = filters.search.toLowerCase()
    rows = rows.filter((lead) => {
      const hay = [
        lead.brand_name,
        lead.contact_name,
        lead.phone,
        lead.line_id,
        lead.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }
  return rows
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!isSupabaseConfigured || !supabase) {
    return mockLeadsApi.getById(id)
  }
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Lead | null
}

export async function createLead(payload: LeadInsert): Promise<Lead> {
  if (!isSupabaseConfigured || !supabase) {
    return mockLeadsApi.create(payload)
  }
  const { data, error } = await supabase.from('leads').insert(payload).select().single()
  if (error) throw new Error(error.message)
  const lead = data as Lead
  await logAudit('lead.create', 'lead', lead.id, {
    brand_name: lead.brand_name,
    status: lead.status,
  })
  return lead
}

export async function updateLead(id: string, payload: LeadUpdate): Promise<Lead> {
  if (!isSupabaseConfigured || !supabase) {
    return mockLeadsApi.update(id, payload)
  }
  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  const lead = data as Lead
  await logAudit('lead.update', 'lead', id, {
    brand_name: lead.brand_name,
    status: lead.status,
  })
  return lead
}

export async function deleteLead(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return mockLeadsApi.remove(id)
  }
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit('lead.delete', 'lead', id)
}

export async function fetchSalesSummary(): Promise<SalesSummaryRow[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockLeadsApi.salesSummary()
  }

  const { data: leads, error } = await supabase.from('leads').select('owner_id, status')
  if (error) throw new Error(error.message)

  const ownerIds = [...new Set((leads ?? []).map((l) => l.owner_id as string))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ownerIds.length ? ownerIds : ['00000000-0000-0000-0000-000000000000'])

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      (p.full_name as string | null) || (p.email as string),
    ]),
  )

  const map = new Map<string, SalesSummaryRow>()
  for (const row of leads ?? []) {
    const ownerId = row.owner_id as string
    const status = row.status as Lead['status']
    const entry = map.get(ownerId) ?? {
      owner_id: ownerId,
      owner_name: nameById.get(ownerId) ?? null,
      total: 0,
      won: 0,
      active: 0,
    }
    entry.total += 1
    if (status === 'won') entry.won += 1
    if (ACTIVE_STATUSES.includes(status)) entry.active += 1
    map.set(ownerId, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

function assertLeadFilePath(path: string, leadId: string, ownerId: string): void {
  const prefix = `${ownerId}/${leadId}/`
  if (!path.startsWith(prefix)) {
    throw new Error('เส้นทางไฟล์ไม่ถูกต้อง')
  }
}

function storageErrorMessage(message: string, fallback: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('payload too large') || lower.includes('exceeded')) {
    return 'ไฟล์ใหญ่เกินไป (สูงสุด 10 MB ต่อไฟล์)'
  }
  if (lower.includes('mime') || lower.includes('invalid')) {
    return 'ประเภทไฟล์ไม่รองรับ — ใช้รูปภาพหรือ PDF เท่านั้น'
  }
  if (lower.includes('not found') || lower.includes('object not found')) {
    return 'ไม่พบไฟล์ (อาจถูกลบไปแล้ว)'
  }
  if (lower.includes('row-level security') || lower.includes('policy')) {
    return 'ไม่มีสิทธิ์ดำเนินการกับไฟล์นี้'
  }
  return fallback
}

export async function uploadLeadFile(
  leadId: string,
  ownerId: string,
  file: File,
): Promise<string> {
  if (!supabase) throw new Error('ต้องตั้งค่า Supabase สำหรับอัปโหลดไฟล์')
  const invalid = validateLeadUploadFile(file)
  if (invalid) throw new Error(invalid)
  const path = `${ownerId}/${leadId}/${Date.now()}_${file.name}`
  const { error } = await supabase.storage.from('leads').upload(path, file, { upsert: false })
  if (error) throw new Error(storageErrorMessage(error.message, 'อัปโหลดไม่สำเร็จ'))
  await logAudit('lead.file_upload', 'lead', leadId, { file_name: file.name, path })
  return path
}

export interface LeadFile {
  name: string
  path: string
}

export async function listLeadFiles(leadId: string, ownerId: string): Promise<LeadFile[]> {
  if (!supabase) return []
  const prefix = `${ownerId}/${leadId}`
  const { data, error } = await supabase.storage.from('leads').list(`${ownerId}/${leadId}`)
  if (error) throw new Error(error.message)
  return (data ?? [])
    .filter(
      (f) =>
        f.name &&
        !f.name.endsWith('/') &&
        f.name !== '.emptyFolderPlaceholder',
    )
    .map((f) => ({ name: f.name, path: `${prefix}/${f.name}` }))
}

const SIGNED_URL_TTL_SEC = 3600

export async function getLeadFileUrl(
  path: string,
  options?: { download?: boolean },
): Promise<string | null> {
  if (!supabase) return null
  const fileName = path.split('/').pop() ?? 'download'
  const { data, error } = await supabase.storage.from('leads').createSignedUrl(path, SIGNED_URL_TTL_SEC, {
    download: options?.download ? fileName : false,
  })
  if (error) throw new Error(storageErrorMessage(error.message, 'ไม่สามารถเปิดไฟล์ได้'))
  return data.signedUrl
}

export async function deleteLeadFile(
  path: string,
  leadId: string,
  ownerId: string,
): Promise<void> {
  if (!supabase) throw new Error('ต้องตั้งค่า Supabase สำหรับลบไฟล์')
  assertLeadFilePath(path, leadId, ownerId)
  const { error } = await supabase.storage.from('leads').remove([path])
  if (error) throw new Error(storageErrorMessage(error.message, 'ลบไฟล์ไม่สำเร็จ'))
  await logAudit('lead.file_delete', 'lead', leadId, { path })
}
