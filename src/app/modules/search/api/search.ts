import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { AppRole } from '../../../../shared/types/roles'
import { statusLabel } from '../../crm/constants'
import { customerStatusLabel } from '../../customers/constants'
import { taskStatusLabel } from '../../tasks/constants'
import type { LeadStatus } from '../../crm/types'
import type { CustomerStatus } from '../../customers/types'
import type { TaskStatus } from '../../tasks/types'
import { filterVisibleSearchResults, searchKindsForRoles } from '../access'
import type { GlobalSearchResponse, SearchResult, SearchResultKind } from '../types'
import { mockSearchApi } from './mockStore'

const PER_KIND_LIMIT = 8

function escapeIlike(q: string): string {
  return q.replace(/[%_,\\]/g, ' ').trim()
}

function isSearchableQuery(q: string): boolean {
  return escapeIlike(q).length >= 2
}

function ilikePattern(q: string): string {
  return `%${escapeIlike(q)}%`
}

/** PostgREST .or() — ค่า ilike ต้องอยู่ใน double quotes เมื่อมี % */
function ilikeOrFilter(columns: string[], q: string): string {
  const pattern = ilikePattern(q)
  const quoted = `"${pattern.replace(/"/g, '""')}"`
  return columns.map((col) => `${col}.ilike.${quoted}`).join(',')
}

function kindLabel(kind: SearchResultKind): string {
  if (kind === 'lead') return 'Lead'
  if (kind === 'customer') return 'ลูกค้า'
  return 'งาน'
}

async function searchLeads(q: string): Promise<SearchResult[]> {
  const { data, error } = await supabase!
    .from('leads')
    .select('id, brand_name, contact_name, status')
    .or(ilikeOrFilter(['brand_name', 'contact_name'], q))
    .order('updated_at', { ascending: false })
    .limit(PER_KIND_LIMIT)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: 'lead' as const,
    title: row.brand_name as string,
    subtitle:
      [row.contact_name, row.status ? statusLabel(row.status as LeadStatus) : null]
        .filter(Boolean)
        .join(' · ') || null,
    href: `/app/crm/${row.id}`,
  }))
}

async function searchCustomers(q: string): Promise<SearchResult[]> {
  const { data, error } = await supabase!
    .from('customers')
    .select('id, brand_name, contact_name, status')
    .or(ilikeOrFilter(['brand_name', 'contact_name', 'phone'], q))
    .order('brand_name')
    .limit(PER_KIND_LIMIT)
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: 'customer' as const,
    title: row.brand_name as string,
    subtitle:
      [
        row.contact_name,
        row.status ? customerStatusLabel(row.status as CustomerStatus) : null,
      ]
        .filter(Boolean)
        .join(' · ') || null,
    href: `/app/customers/${row.id}`,
  }))
}

async function searchTasks(q: string): Promise<SearchResult[]> {
  const { data, error } = await supabase!
    .from('tasks')
    .select('id, title, status, customers(brand_name)')
    .ilike('title', ilikePattern(q))
    .order('updated_at', { ascending: false })
    .limit(PER_KIND_LIMIT)
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>
    const customer = r.customers as { brand_name: string } | null
    return {
      id: r.id as string,
      kind: 'task' as const,
      title: r.title as string,
      subtitle:
        [
          customer?.brand_name,
          r.status ? taskStatusLabel(r.status as TaskStatus) : null,
        ]
          .filter(Boolean)
          .join(' · ') || null,
      href: `/app/tasks/${r.id}`,
    }
  })
}

function finalizeResults(
  query: string,
  raw: SearchResult[],
  roles: AppRole[],
): GlobalSearchResponse {
  return {
    query,
    results: filterVisibleSearchResults(raw, roles),
  }
}

export async function globalSearch(
  query: string,
  roles: AppRole[] = [],
): Promise<GlobalSearchResponse> {
  const trimmed = query.trim()
  const kinds = searchKindsForRoles(roles)

  if (!isSearchableQuery(trimmed) || kinds.length === 0) {
    return { query: trimmed, results: [] }
  }

  if (!isSupabaseConfigured || !supabase) {
    const results = await mockSearchApi.search(trimmed, kinds)
    return finalizeResults(trimmed, results, roles)
  }

  const tasks: Promise<SearchResult[]>[] = []
  if (kinds.includes('lead')) tasks.push(searchLeads(trimmed))
  if (kinds.includes('customer')) tasks.push(searchCustomers(trimmed))
  if (kinds.includes('task')) tasks.push(searchTasks(trimmed))

  const chunks = await Promise.all(tasks)
  return finalizeResults(trimmed, chunks.flat(), roles)
}

export function searchResultTypeLabel(kind: SearchResultKind): string {
  return kindLabel(kind)
}
