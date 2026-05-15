import { bangkokWeekStartIso } from '../../../../shared/dates/bangkok'
import { isTaskOverdue } from '../constants'
import type { AssigneeOption, Task, TaskFilters, TaskInput, TaskSummary } from '../types'

const KEY = 'npcreate_tasks_dev'
const CUST_KEY = 'npcreate_customers_dev'

function load(): Task[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Task[]) : []
  } catch {
    return []
  }
}

function save(rows: Task[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

function customerName(id: string | null): string | null {
  if (!id) return null
  try {
    const raw = localStorage.getItem(CUST_KEY)
    const rows = raw ? (JSON.parse(raw) as { id: string; brand_name: string }[]) : []
    return rows.find((c) => c.id === id)?.brand_name ?? null
  } catch {
    return null
  }
}

function enrich(row: Task): Task {
  return {
    ...row,
    assignee_name: 'ผู้รับผิดชอบ (Dev)',
    customer_brand_name: customerName(row.customer_id),
  }
}

export const mockTasksApi = {
  async listTasks(userId: string, filters: TaskFilters, privileged: boolean): Promise<Task[]> {
    let rows = load().map(enrich)
    const scope = filters.scope ?? (privileged ? 'all' : 'mine')
    if (scope === 'mine') {
      rows = rows.filter((t) => t.assignee_id === userId || t.created_by === userId)
    }
    if (filters.status) rows = rows.filter((t) => t.status === filters.status)
    if (filters.assignee_id) rows = rows.filter((t) => t.assignee_id === filters.assignee_id)
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },

  async getTask(id: string): Promise<Task | null> {
    const row = load().find((t) => t.id === id)
    return row ? enrich(row) : null
  },

  async getSummary(userId: string, privileged: boolean): Promise<TaskSummary> {
    const scope = privileged ? 'all' : 'mine'
    const rows = await mockTasksApi.listTasks(userId, { scope }, privileged)
    const weekStart = `${bangkokWeekStartIso()}T00:00:00+07:00`
    return {
      open_count: rows.filter((t) => t.status !== 'done').length,
      blocked_count: rows.filter((t) => t.status === 'blocked').length,
      overdue_count: rows.filter((t) => isTaskOverdue(t.due_at, t.status)).length,
      done_this_week: rows.filter(
        (t) => t.status === 'done' && t.completed_at && t.completed_at >= weekStart,
      ).length,
    }
  },

  async listAssignees(): Promise<AssigneeOption[]> {
    return [{ id: '00000000-0000-4000-8000-000000000001', label: 'Dev User' }]
  },

  async createTask(input: TaskInput): Promise<Task> {
    const now = new Date().toISOString()
    const row: Task = {
      id: crypto.randomUUID(),
      ...input,
      completed_at: input.status === 'done' ? now : null,
      created_at: now,
      updated_at: now,
    }
    const all = load()
    all.unshift(row)
    save(all)
    return enrich(row)
  },

  async updateTask(id: string, input: TaskInput): Promise<Task> {
    const all = load()
    const idx = all.findIndex((t) => t.id === id)
    if (idx < 0) throw new Error('ไม่พบงาน')
    const now = new Date().toISOString()
    const prev = all[idx]
    const completed_at = input.status === 'done' ? (prev.completed_at ?? now) : null
    all[idx] = { ...prev, ...input, completed_at, updated_at: now }
    save(all)
    return enrich(all[idx])
  },

  async deleteTask(id: string): Promise<void> {
    save(load().filter((t) => t.id !== id))
  },
}
