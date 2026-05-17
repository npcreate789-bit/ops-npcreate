import type { ContentPipelineFilter } from '../pipeline'
import { CONTENT_PIPELINE_FILTERS } from '../pipeline'

interface ContentPipelineFilterBarProps {
  active: ContentPipelineFilter
  onSelect: (filter: ContentPipelineFilter) => void
  counts: Partial<Record<ContentPipelineFilter, number>>
}

export function ContentPipelineFilterBar({
  active,
  onSelect,
  counts,
}: ContentPipelineFilterBarProps) {
  return (
    <div className="content-pipeline-bar" role="tablist" aria-label="กรองตามขั้นตอนงาน">
      {CONTENT_PIPELINE_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`content-pipeline-bar__stage${
              isActive ? ' content-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="content-pipeline-bar__label">{f.label}</span>
            <span className="content-pipeline-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
