export type CreatorStatus = 'active' | 'inactive' | 'blacklist'

export interface Creator {
  id: string
  display_name: string
  tiktok_handle: string | null
  line_id: string | null
  phone: string | null
  niche: string | null
  rate_per_clip: number | null
  status: CreatorStatus
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreatorInput {
  display_name: string
  tiktok_handle: string | null
  line_id: string | null
  phone: string | null
  niche: string | null
  rate_per_clip: number | null
  status: CreatorStatus
  notes: string | null
  created_by: string
}

export interface CreatorFilters {
  search?: string
  status?: CreatorStatus | ''
}
