import { REPORTS_FOCUS_FILTERS, type ReportsFocusFilter } from '../pipeline'

interface ReportsFocusFilterBarProps {
  active: ReportsFocusFilter
  onSelect: (filter: ReportsFocusFilter) => void
  counts: Partial<Record<ReportsFocusFilter, number>>
}

export function ReportsFocusFilterBar({
  active,
  onSelect,
  counts,
}: ReportsFocusFilterBarProps) {
  return (
    <div
      className="reports-focus-bar"
      role="tablist"
      aria-label="กรองคำแนะนำตามหมวด"
    >
      {REPORTS_FOCUS_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`reports-focus-bar__stage${
              isActive ? ' reports-focus-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="reports-focus-bar__label">{f.label}</span>
            <span className="reports-focus-bar__meta">
              {f.hint}
              {f.value !== 'all' && count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
