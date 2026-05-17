import type { RenewalPipelineFilter } from '../pipeline'
import { RENEWAL_PIPELINE_FILTERS } from '../pipeline'

interface RenewalsPipelineFilterBarProps {
  active: RenewalPipelineFilter
  onSelect: (filter: RenewalPipelineFilter) => void
  counts: Partial<Record<RenewalPipelineFilter, number>>
}

export function RenewalsPipelineFilterBar({
  active,
  onSelect,
  counts,
}: RenewalsPipelineFilterBarProps) {
  return (
    <div className="renewals-pipeline-bar" role="tablist" aria-label="กรองเคสต่อสัญญา">
      {RENEWAL_PIPELINE_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`renewals-pipeline-bar__stage${
              isActive ? ' renewals-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="renewals-pipeline-bar__label">{f.label}</span>
            <span className="renewals-pipeline-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
