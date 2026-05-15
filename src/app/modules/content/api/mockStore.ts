import type { ContentJob, ContentJobFilters, ContentJobInput, ContentJobSummary } from '../types'

const STORE: ContentJob[] = [
  {
    id: 'cjob-1',
    customer_id: 'cust-1',
    title: 'คลิปเปิดตัวสินค้า A',
    brief: 'โทนกระตือรือร้น 15 วินาที',
    format: 'short_clip',
    status: 'in_production',
    assignee_id: '00000000-0000-4000-8000-000000000001',
    created_by: '00000000-0000-4000-8000-000000000001',
    deliverable_url: null,
    due_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    delivered_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_brand_name: 'แบรนด์เดโม่',
    assignee_name: 'Content Demo',
  },
]

function matchFilters(
  row: ContentJob,
  userId: string,
  filters: ContentJobFilters,
  privileged: boolean,
): boolean {
  if (!privileged && filters.scope !== 'all') {
    if (row.assignee_id !== userId && row.created_by !== userId) return false
  }
  if (filters.status && row.status !== filters.status) return false
  if (filters.assignee_id && row.assignee_id !== filters.assignee_id) return false
  return true
}

export const mockContentApi = {
  async listJobs(
    userId: string,
    filters: ContentJobFilters,
    privileged: boolean,
  ): Promise<ContentJob[]> {
    return STORE.filter((r) => matchFilters(r, userId, filters, privileged))
  },

  async getJob(id: string): Promise<ContentJob | null> {
    return STORE.find((r) => r.id === id) ?? null
  },

  async getSummary(
    userId: string,
    privileged: boolean,
  ): Promise<ContentJobSummary> {
    const rows = await mockContentApi.listJobs(userId, {}, privileged)
    return {
      open_count: rows.filter((r) => r.status === 'briefed').length,
      in_production_count: rows.filter((r) => r.status === 'in_production').length,
      review_count: rows.filter((r) => r.status === 'review').length,
      overdue_count: rows.filter((r) => isOverdue(r)).length,
    }
  },

  async createJob(input: ContentJobInput): Promise<ContentJob> {
    const row: ContentJob = {
      id: `cjob-${Date.now()}`,
      ...input,
      delivered_at: input.status === 'delivered' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    STORE.unshift(row)
    return row
  },

  async updateJob(id: string, input: ContentJobInput): Promise<ContentJob> {
    const i = STORE.findIndex((r) => r.id === id)
    if (i < 0) throw new Error('ไม่พบงาน')
    const row: ContentJob = {
      ...STORE[i],
      ...input,
      delivered_at:
        input.status === 'delivered'
          ? STORE[i].delivered_at ?? new Date().toISOString()
          : null,
      updated_at: new Date().toISOString(),
    }
    STORE[i] = row
    return row
  },

  async deleteJob(id: string): Promise<void> {
    const i = STORE.findIndex((r) => r.id === id)
    if (i >= 0) STORE.splice(i, 1)
  },
}

function isOverdue(row: ContentJob): boolean {
  if (!row.due_at || row.status === 'delivered' || row.status === 'cancelled') return false
  return new Date(row.due_at) < new Date()
}
