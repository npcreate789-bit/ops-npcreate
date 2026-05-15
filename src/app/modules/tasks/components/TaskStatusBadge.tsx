import { taskStatusLabel } from '../constants'
import type { TaskStatus } from '../types'

const CLASS: Record<TaskStatus, string> = {
  todo: 'task-badge task-badge--todo',
  in_progress: 'task-badge task-badge--progress',
  blocked: 'task-badge task-badge--blocked',
  done: 'task-badge task-badge--done',
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={CLASS[status]}>{taskStatusLabel(status)}</span>
}
