import type { CreatorPipelineFilter } from '../pipeline'
import { CREATOR_PIPELINE_FILTERS } from '../pipeline'

interface CreatorsPipelineFilterBarProps {
  active: CreatorPipelineFilter
  onSelect: (filter: CreatorPipelineFilter) => void
  counts: Partial<Record<CreatorPipelineFilter, number>>
}

export function CreatorsPipelineFilterBar({
  active,
  onSelect,
  counts,
}: CreatorsPipelineFilterBarProps) {
  return (
    <div className="creators-pipeline-bar" role="tablist" aria-label="กรองตามสถานะครีเอเตอร์">
      {CREATOR_PIPELINE_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`creators-pipeline-bar__stage${
              isActive ? ' creators-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="creators-pipeline-bar__label">{f.label}</span>
            <span className="creators-pipeline-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
