import { isContentOverdue } from './constants'
import type { ContentJob } from './types'

export type ContentPipelineFilter =
  | 'all'
  | 'briefed'
  | 'in_production'
  | 'review'
  | 'overdue'
  | 'delivered'

export const CONTENT_PIPELINE_FILTERS: {
  value: ContentPipelineFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'งานทุกสถานะ' },
  { value: 'briefed', label: 'รับบรีฟ', hint: 'รอเริ่มผลิต' },
  { value: 'in_production', label: 'กำลังผลิต', hint: 'ทีมทำอยู่' },
  { value: 'review', label: 'รอตรวจ', hint: 'รอส่งลูกค้า' },
  { value: 'overdue', label: 'เกินกำหนด', hint: 'เลย due date' },
  { value: 'delivered', label: 'ส่งมอบแล้ว', hint: 'ลูกค้าเห็นในพื้นที่ลูกค้า' },
]

export function matchesContentPipeline(job: ContentJob, filter: ContentPipelineFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'overdue') return isContentOverdue(job.due_at, job.status)
  return job.status === filter
}
