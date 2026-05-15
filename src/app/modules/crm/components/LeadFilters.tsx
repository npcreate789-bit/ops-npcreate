import type { LeadFilters as Filters } from '../types'
import { LEAD_CHANNEL_OPTIONS, LEAD_STATUS_OPTIONS } from '../constants'
import '../../tasks/tasks.css'
import '../crm.css'

interface LeadFiltersProps {
  filters: Filters
  onChange: (next: Filters) => void
  showOwnerFilter?: boolean
  owners?: { id: string; name: string }[]
}

export function LeadFiltersBar({
  filters,
  onChange,
  showOwnerFilter,
  owners = [],
}: LeadFiltersProps) {
  return (
    <div className="task-filters crm-filters">
      <label className="task-field task-field--grow">
        <span className="task-field__label">ค้นหา</span>
        <input
          type="search"
          placeholder="แบรนด์, ชื่อ, เบอร์..."
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="crm-input"
        />
      </label>
      <label className="task-field">
        <span className="task-field__label">สถานะ</span>
        <select
          value={filters.status ?? 'all'}
          onChange={(e) =>
            onChange({
              ...filters,
              status: e.target.value as Filters['status'],
            })
          }
          className="task-select"
        >
          <option value="all">ทั้งหมด</option>
          {LEAD_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="task-field">
        <span className="task-field__label">ช่องทาง</span>
        <select
          value={filters.channel ?? 'all'}
          onChange={(e) =>
            onChange({
              ...filters,
              channel: e.target.value as Filters['channel'],
            })
          }
          className="task-select"
        >
          <option value="all">ทั้งหมด</option>
          {LEAD_CHANNEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {showOwnerFilter && (
        <label className="task-field">
          <span className="task-field__label">Sales</span>
          <select
            value={filters.ownerId ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                ownerId: e.target.value || undefined,
              })
            }
            className="task-select"
          >
            <option value="">ทั้งหมด</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
