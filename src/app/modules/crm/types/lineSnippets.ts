export type LineSnippetCategory =
  | 'service_intro'
  | 'promotion'
  | 'follow_up'
  | 'objection'
  | 'general'

export interface LineMessageSnippet {
  id: string
  package_code: string | null
  category: LineSnippetCategory
  title: string
  body: string
  sort_order: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface LineSnippetInput {
  package_code: string | null
  category: LineSnippetCategory
  title: string
  body: string
  sort_order?: number
  is_active?: boolean
  valid_from?: string | null
  valid_until?: string | null
}

export const LINE_SNIPPET_CATEGORY_LABELS: Record<LineSnippetCategory, string> = {
  service_intro: 'นำเสนอบริการ',
  promotion: 'โปรโมชั่น',
  follow_up: 'ติดตาม',
  objection: 'ตอบข้อสงสัย',
  general: 'ทั่วไป',
}
