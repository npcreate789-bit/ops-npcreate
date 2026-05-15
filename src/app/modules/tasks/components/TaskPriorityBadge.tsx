import { taskPriorityLabel } from '../constants'
import type { TaskPriority } from '../types'

const CLASS: Record<TaskPriority, string> = {
  low: 'task-priority task-priority--low',
  medium: 'task-priority task-priority--medium',
  high: 'task-priority task-priority--high',
  urgent: 'task-priority task-priority--urgent',
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={CLASS[priority]}>{taskPriorityLabel(priority)}</span>
}
