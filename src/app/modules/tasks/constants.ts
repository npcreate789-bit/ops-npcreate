import type { TaskPriority, TaskStatus } from './types'

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'รอทำ' },
  { value: 'in_progress', label: 'กำลังทำ' },
  { value: 'blocked', label: 'ติดขัด' },
  { value: 'done', label: 'เสร็จแล้ว' },
]

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'ต่ำ' },
  { value: 'medium', label: 'ปานกลาง' },
  { value: 'high', label: 'สูง' },
  { value: 'urgent', label: 'ด่วน' },
]

export function taskStatusLabel(s: TaskStatus): string {
  return TASK_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
}

export function taskPriorityLabel(p: TaskPriority): string {
  return TASK_PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? p
}

export function isTaskOverdue(dueAt: string | null, status: TaskStatus): boolean {
  if (!dueAt || status === 'done') return false
  return new Date(dueAt) < new Date()
}
