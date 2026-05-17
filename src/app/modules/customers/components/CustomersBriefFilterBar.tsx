import type { CustomerBriefFilter } from '../pipeline'
import { CUSTOMER_BRIEF_FILTERS } from '../pipeline'

interface CustomersBriefFilterBarProps {
  active: CustomerBriefFilter
  onSelect: (filter: CustomerBriefFilter) => void
  counts: Partial<Record<CustomerBriefFilter, number>>
}

export function CustomersBriefFilterBar({
  active,
  onSelect,
  counts,
}: CustomersBriefFilterBarProps) {
  return (
    <div className="customers-pipeline-bar" role="tablist" aria-label="กรองตามขั้นตอนบรีฟ">
      {CUSTOMER_BRIEF_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`customers-pipeline-bar__stage${
              isActive ? ' customers-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="customers-pipeline-bar__label">{f.label}</span>
            <span className="customers-pipeline-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
