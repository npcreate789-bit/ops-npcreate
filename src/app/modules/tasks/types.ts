export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string
  created_by: string
  customer_id: string | null
  project_id: string | null
  lead_id: string | null
  due_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  assignee_name?: string | null
  customer_brand_name?: string | null
  project_name?: string | null
}

export interface TaskInput {
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string
  created_by: string
  customer_id: string | null
  project_id: string | null
  lead_id: string | null
  due_at: string | null
}

export interface TaskFilters {
  scope?: 'mine' | 'all'
  status?: TaskStatus | ''
  assignee_id?: string
  project_id?: string
}

export interface ProjectTaskOption {
  id: string
  label: string
  customer_id: string
}

export interface TaskSummary {
  open_count: number
  blocked_count: number
  overdue_count: number
  done_this_week: number
}

export interface AssigneeOption {
  id: string
  label: string
}
