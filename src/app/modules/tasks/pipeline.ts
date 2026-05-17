import { isTaskOverdue } from './constants'
import type { Task } from './types'

export type TaskPipelineFilter =
  | 'all'
  | 'todo'
  | 'in_progress'
  | 'blocked'
  | 'overdue'
  | 'done'

export const TASK_PIPELINE_FILTERS: {
  value: TaskPipelineFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'งานทุกสถานะ' },
  { value: 'todo', label: 'รอทำ', hint: 'ยังไม่เริ่ม' },
  { value: 'in_progress', label: 'กำลังทำ', hint: 'กำลังดำเนินการ' },
  { value: 'blocked', label: 'ติดขัด', hint: 'ต้องแก้ก่อนทำต่อ' },
  { value: 'overdue', label: 'เกินกำหนด', hint: 'เลย due date' },
  { value: 'done', label: 'เสร็จแล้ว', hint: 'ปิดงานแล้ว' },
]

export function matchesTaskPipeline(task: Task, filter: TaskPipelineFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'overdue') return isTaskOverdue(task.due_at, task.status)
  return task.status === filter
}
