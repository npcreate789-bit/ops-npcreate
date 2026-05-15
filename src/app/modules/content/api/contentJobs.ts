import { logAudit } from '../../../../shared/audit/logAudit'
import { datetimeLocalBangkokToIso, isoToDatetimeLocalBangkok } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { listAssignees } from '../../tasks/api/tasks'
import { isContentOverdue } from '../constants'
import type {
  ContentJob,
  ContentJobFilters,
  ContentJobInput,
  ContentJobSummary,
} from '../types'
import { mockContentApi } from './mockStore'

export { listAssignees as listContentAssignees }

function mapRow(
  row: Record<string, unknown>,
  assigneeMap: Map<string, string>,
  customerMap: Map<string, string>,
): ContentJob {
  const assigneeId = row.assignee_id as string
  const customerId = row.customer_id as string
  return {
    id: row.id as string,
    customer_id: customerId,
    title: row.title as string,
    brief: (row.brief as string | null) ?? null,
    format: row.format as ContentJob['format'],
    status: row.status as ContentJob['status'],
    assignee_id: assigneeId,
    created_by: row.created_by as string,
    deliverable_url: (row.deliverable_url as string | null) ?? null,
    due_at: (row.due_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    assignee_name: assigneeMap.get(assigneeId) ?? null,
    customer_brand_name: customerMap.get(customerId) ?? null,
  }
}

async function enrichRows(rows: Record<string, unknown>[]): Promise<ContentJob[]> {
  const assignees = await listAssignees()
  const assigneeMap = new Map(assignees.map((a) => [a.id, a.label]))

  let customerMap = new Map<string, string>()
  if (isSupabaseConfigured && supabase && rows.length > 0) {
    const ids = [...new Set(rows.map((r) => r.customer_id as string))]
    const { data } = await supabase.from('customers').select('id, brand_name').in('id', ids)
    customerMap = new Map((data ?? []).map((c) => [c.id as string, c.brand_name as string]))
  }

  return rows.map((r) => mapRow(r, assigneeMap, customerMap))
}

export async function listContentJobs(
  userId: string,
  filters: ContentJobFilters,
  privileged: boolean,
): Promise<ContentJob[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockContentApi.listJobs(userId, filters, privileged)
  }

  let query = supabase
    .from('content_jobs')
    .select('*')
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const showTeamAll = privileged && filters.scope !== 'mine'
  if (!showTeamAll) {
    query = query.or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return enrichRows(data ?? [])
}

export async function getContentJob(id: string): Promise<ContentJob | null> {
  if (!isSupabaseConfigured || !supabase) return mockContentApi.getJob(id)

  const { data, error } = await supabase.from('content_jobs').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const [job] = await enrichRows([data])
  return job
}

export async function getContentSummary(
  userId: string,
  privileged: boolean,
  scope: ContentJobFilters['scope'] = 'all',
): Promise<ContentJobSummary> {
  if (!isSupabaseConfigured || !supabase) {
    return mockContentApi.getSummary(userId, privileged)
  }

  const rows = await listContentJobs(userId, { scope }, privileged)
  return {
    open_count: rows.filter((r) => r.status === 'briefed').length,
    in_production_count: rows.filter((r) => r.status === 'in_production').length,
    review_count: rows.filter((r) => r.status === 'review').length,
    overdue_count: rows.filter((r) => isContentOverdue(r.due_at, r.status)).length,
  }
}

export function contentJobToForm(job: ContentJob) {
  return {
    customer_id: job.customer_id,
    title: job.title,
    brief: job.brief ?? '',
    format: job.format,
    status: job.status,
    assignee_id: job.assignee_id,
    deliverable_url: job.deliverable_url ?? '',
    due_at: isoToDatetimeLocalBangkok(job.due_at),
  }
}

export function formToContentInput(
  form: ReturnType<typeof contentJobToForm>,
  createdBy: string,
): ContentJobInput {
  return {
    customer_id: form.customer_id,
    title: form.title.trim(),
    brief: form.brief.trim() || null,
    format: form.format,
    status: form.status,
    assignee_id: form.assignee_id,
    created_by: createdBy,
    deliverable_url: form.deliverable_url.trim() || null,
    due_at: form.due_at ? datetimeLocalBangkokToIso(form.due_at) : null,
  }
}

export async function createContentJob(input: ContentJobInput): Promise<ContentJob> {
  if (!isSupabaseConfigured || !supabase) return mockContentApi.createJob(input)

  const payload = {
    ...input,
    delivered_at: input.status === 'delivered' ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase.from('content_jobs').insert(payload).select('*').single()
  if (error) throw new Error(error.message)
  await logAudit('content_job.create', 'content_job', data.id as string)
  const [job] = await enrichRows([data])
  return job
}

export async function updateContentJob(
  id: string,
  input: ContentJobInput,
): Promise<ContentJob> {
  if (!isSupabaseConfigured || !supabase) return mockContentApi.updateJob(id, input)

  const { data: existing } = await supabase
    .from('content_jobs')
    .select('delivered_at, status')
    .eq('id', id)
    .maybeSingle()

  const payload = {
    customer_id: input.customer_id,
    title: input.title,
    brief: input.brief,
    format: input.format,
    status: input.status,
    assignee_id: input.assignee_id,
    deliverable_url: input.deliverable_url,
    due_at: input.due_at,
    delivered_at:
      input.status === 'delivered'
        ? (existing?.delivered_at as string | null) ?? new Date().toISOString()
        : null,
  }

  const { data, error } = await supabase
    .from('content_jobs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  await logAudit('content_job.update', 'content_job', id)
  const [job] = await enrichRows([data])
  return job
}

export async function deleteContentJob(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockContentApi.deleteJob(id)
    return
  }

  const { error } = await supabase.from('content_jobs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit('content_job.delete', 'content_job', id)
}
