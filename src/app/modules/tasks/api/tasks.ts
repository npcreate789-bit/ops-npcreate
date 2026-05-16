import { logAudit } from '../../../../shared/audit/logAudit'
import { bangkokWeekStartIso } from '../../../../shared/dates/bangkok'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { isTaskOverdue } from '../constants'
import type { AssigneeOption, Task, TaskFilters, TaskInput, TaskSummary } from '../types'
import { mockTasksApi } from './mockStore'

function mapTask(row: Record<string, unknown>, assigneeName?: string | null): Task {
  const customer = row.customers as { brand_name: string } | null
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status: row.status as Task['status'],
    priority: row.priority as Task['priority'],
    assignee_id: row.assignee_id as string,
    created_by: row.created_by as string,
    customer_id: (row.customer_id as string) ?? null,
    lead_id: (row.lead_id as string) ?? null,
    due_at: (row.due_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    assignee_name: assigneeName ?? null,
    customer_brand_name: customer?.brand_name ?? null,
  }
}

const taskSelect = '*, customers(brand_name)'

async function assigneeNameMap(): Promise<Map<string, string>> {
  const list = await listAssignees()
  return new Map(list.map((a) => [a.id, a.label]))
}

export async function listTasks(
  userId: string,
  filters: TaskFilters,
  privileged: boolean,
): Promise<Task[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockTasksApi.listTasks(userId, filters, privileged)
  }

  const db = supabase
  let query = db.from('tasks').select(taskSelect).order('updated_at', { ascending: false })

  const scope = filters.scope ?? (privileged ? 'all' : 'mine')
  if (scope === 'mine') {
    query = query.or(`assignee_id.eq.${userId},created_by.eq.${userId}`)
  }
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const names = await assigneeNameMap()
  return (data ?? []).map((r) =>
    mapTask(r as Record<string, unknown>, names.get((r as { assignee_id: string }).assignee_id)),
  )
}

export async function getTask(id: string): Promise<Task | null> {
  if (!isSupabaseConfigured || !supabase) return mockTasksApi.getTask(id)

  const { data, error } = await supabase
    .from('tasks')
    .select(taskSelect)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  const names = await assigneeNameMap()
  const row = data as Record<string, unknown> & { assignee_id: string }
  return mapTask(row, names.get(row.assignee_id))
}

export async function getTaskSummary(
  userId: string,
  privileged: boolean,
): Promise<TaskSummary> {
  if (!isSupabaseConfigured || !supabase) {
    return mockTasksApi.getSummary(userId, privileged)
  }

  const rows = await listTasks(userId, { scope: privileged ? 'all' : 'mine' }, privileged)
  const weekStart = `${bangkokWeekStartIso()}T00:00:00+07:00`
  return {
    open_count: rows.filter((t) => t.status !== 'done').length,
    blocked_count: rows.filter((t) => t.status === 'blocked').length,
    overdue_count: rows.filter((t) => isTaskOverdue(t.due_at, t.status)).length,
    done_this_week: rows.filter(
      (t) => t.status === 'done' && t.completed_at && t.completed_at >= weekStart,
    ).length,
  }
}

export async function listAssignees(): Promise<AssigneeOption[]> {
  if (!isSupabaseConfigured || !supabase) return mockTasksApi.listAssignees()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new Error(error.message)
  return (data ?? []).map((p) => ({
    id: p.id as string,
    label: (p.full_name as string | null) || (p.email as string),
  }))
}

export async function createTask(input: TaskInput): Promise<Task> {
  if (!isSupabaseConfigured || !supabase) return mockTasksApi.createTask(input)

  const payload = {
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    assignee_id: input.assignee_id,
    created_by: input.created_by,
    customer_id: input.customer_id,
    lead_id: input.lead_id,
    due_at: input.due_at,
    completed_at: input.status === 'done' ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase.from('tasks').insert(payload).select(taskSelect).single()
  if (error) throw new Error(error.message)
  const taskId = data.id as string
  await logAudit('task.create', 'task', taskId, { title: input.title, status: input.status })
  const names = await assigneeNameMap()
  const row = data as Record<string, unknown> & { assignee_id: string }
  return mapTask(row, names.get(row.assignee_id))
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  if (!isSupabaseConfigured || !supabase) return mockTasksApi.updateTask(id, input)

  const payload = {
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    assignee_id: input.assignee_id,
    customer_id: input.customer_id,
    lead_id: input.lead_id,
    due_at: input.due_at,
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select(taskSelect)
    .single()

  if (error) throw new Error(error.message)
  await logAudit('task.update', 'task', id, { title: input.title, status: input.status })
  const names = await assigneeNameMap()
  const row = data as Record<string, unknown> & { assignee_id: string }
  return mapTask(row, names.get(row.assignee_id))
}

export async function deleteTask(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return mockTasksApi.deleteTask(id)
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await logAudit('task.delete', 'task', id)
}
