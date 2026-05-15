export type ContentJobStatus =
  | 'briefed'
  | 'in_production'
  | 'review'
  | 'delivered'
  | 'cancelled'

export type ContentFormat = 'short_clip' | 'live_clip' | 'graphic' | 'ugc' | 'other'

export interface ContentJob {
  id: string
  customer_id: string
  title: string
  brief: string | null
  format: ContentFormat
  status: ContentJobStatus
  assignee_id: string
  created_by: string
  deliverable_url: string | null
  due_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
  assignee_name?: string | null
  customer_brand_name?: string | null
}

export interface ContentJobInput {
  customer_id: string
  title: string
  brief: string | null
  format: ContentFormat
  status: ContentJobStatus
  assignee_id: string
  created_by: string
  deliverable_url: string | null
  due_at: string | null
}

export interface ContentJobFilters {
  scope?: 'mine' | 'all'
  status?: ContentJobStatus | ''
  assignee_id?: string
}

export interface ContentJobSummary {
  open_count: number
  in_production_count: number
  review_count: number
  overdue_count: number
}
