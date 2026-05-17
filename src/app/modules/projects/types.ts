export type ProjectStatus =
  | 'onboarding'
  | 'waiting_brief'
  | 'planning'
  | 'in_progress'
  | 'waiting_approval'
  | 'completed'
  | 'renewal'
  | 'closed'

export type ProjectServiceType =
  | 'GMV_MAX'
  | 'CONTENT'
  | 'TIKTOK_ONE'
  | 'LIVE'
  | 'CONSULTING'
  | 'COURSE'
  | 'SOFTWARE'
  | 'OTHER'

export interface Project {
  id: string
  customer_id: string
  project_name: string
  service_type: ProjectServiceType
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  progress: number
  account_owner_id: string | null
  ads_owner_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  customer?: { brand_name: string }
}

export type ProjectInsert = Pick<
  Project,
  'customer_id' | 'project_name' | 'service_type' | 'status' | 'start_date' | 'end_date' | 'progress' | 'notes'
> & {
  account_owner_id?: string | null
  ads_owner_id?: string | null
}

export type ProjectUpdate = Partial<Omit<ProjectInsert, 'customer_id'>>
