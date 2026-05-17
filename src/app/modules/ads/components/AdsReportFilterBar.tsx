import type { AdsReportFilter } from '../pipeline'
import { ADS_REPORT_FILTERS } from '../pipeline'

interface AdsReportFilterBarProps {
  active: AdsReportFilter
  onSelect: (filter: AdsReportFilter) => void
  counts: Partial<Record<AdsReportFilter, number>>
}

export function AdsReportFilterBar({ active, onSelect, counts }: AdsReportFilterBarProps) {
  return (
    <div className="ads-pipeline-bar" role="tablist" aria-label="กรองสถานะรายงานวันนี้">
      {ADS_REPORT_FILTERS.map((f) => {
        const count = counts[f.value] ?? 0
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ads-pipeline-bar__stage${
              isActive ? ' ads-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(f.value)}
          >
            <span className="ads-pipeline-bar__label">{f.label}</span>
            <span className="ads-pipeline-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
