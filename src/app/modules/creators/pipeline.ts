import type { Creator, CreatorStatus } from './types'

export type CreatorPipelineFilter = 'all' | CreatorStatus

export const CREATOR_PIPELINE_FILTERS: {
  value: CreatorPipelineFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'ครีเอเตอร์ทุกคน' },
  { value: 'active', label: 'ใช้งาน', hint: 'พร้อมจ้างงาน' },
  { value: 'inactive', label: 'พัก', hint: 'พักชั่วคราว' },
  { value: 'blacklist', label: 'แบล็กลิสต์', hint: 'ห้ามจ้าง' },
]

export function matchesCreatorPipeline(
  creator: Creator,
  filter: CreatorPipelineFilter,
): boolean {
  if (filter === 'all') return true
  return creator.status === filter
}

export function creatorStatusClass(status: CreatorStatus): string {
  return `creator-badge creator-badge--${status}`
}
