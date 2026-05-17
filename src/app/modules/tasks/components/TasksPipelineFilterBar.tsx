import type { TaskPipelineFilter } from '../pipeline'
import { TASK_PIPELINE_FILTERS } from '../pipeline'

interface TasksPipelineFilterBarProps {
  active: TaskPipelineFilter
  onSelect: (filter: TaskPipelineFilter) => void
  counts: Partial<Record<TaskPipelineFilter, number>>
}

export function TasksPipelineFilterBar({
  active,
  onSelect,
  counts,
}: TasksPipelineFilterBarProps) {
  return (
    <div className="tasks-pipeline-bar" role="tablist" aria-label="กรองตามสถานะงาน">
      {TASK_PIPELINE_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tasks-pipeline-bar__stage${
              isActive ? ' tasks-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="tasks-pipeline-bar__label">{f.label}</span>
            <span className="tasks-pipeline-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
