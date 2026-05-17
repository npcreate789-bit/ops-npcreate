import type { ProjectPipelineFilter } from '../pipeline'
import { PROJECT_PIPELINE_STAGES } from '../pipeline'

interface ProjectsPipelineBarProps {
  active: ProjectPipelineFilter
  onSelect: (filter: ProjectPipelineFilter) => void
  counts: Partial<Record<ProjectPipelineFilter, number>>
}

export function ProjectsPipelineBar({ active, onSelect, counts }: ProjectsPipelineBarProps) {
  const total = counts.all ?? 0

  return (
    <div className="projects-pipeline-bar" role="tablist" aria-label="ขั้นตอนโปรเจกต์">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        className={`projects-pipeline-bar__stage${
          active === 'all' ? ' projects-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelect('all')}
      >
        <span className="projects-pipeline-bar__label">ทั้งหมด</span>
        {total > 0 && <span className="projects-pipeline-bar__meta">{total}</span>}
      </button>
      {PROJECT_PIPELINE_STAGES.map((s) => {
        const count = counts[s.stage] ?? 0
        const isActive = active === s.stage
        return (
          <button
            key={s.stage}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`projects-pipeline-bar__stage${
              isActive ? ' projects-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(s.stage)}
          >
            <span className="projects-pipeline-bar__label">{s.label}</span>
            <span className="projects-pipeline-bar__meta">
              {s.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
