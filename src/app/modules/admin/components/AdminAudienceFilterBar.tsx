import type { AdminAudienceFilter } from '../userAudience'

const BASE_FILTERS: {
  value: AdminAudienceFilter
  label: string
  hint: string
}[] = [
  { value: 'staff', label: 'พนักงาน', hint: 'ทีมภายในเท่านั้น' },
  { value: 'client', label: 'ลูกค้า (พอร์ทัล)', hint: 'บัญชีแบรนด์เท่านั้น' },
  { value: 'all', label: 'ทั้งหมด', hint: 'รวมทุกประเภท' },
]

interface AdminAudienceFilterBarProps {
  active: AdminAudienceFilter
  onSelect: (filter: AdminAudienceFilter) => void
  counts: Partial<Record<AdminAudienceFilter, number>>
}

export function AdminAudienceFilterBar({
  active,
  onSelect,
  counts,
}: AdminAudienceFilterBarProps) {
  const mixedCount = counts.mixed ?? 0
  const filters =
    mixedCount > 0
      ? [
          ...BASE_FILTERS.slice(0, 2),
          {
            value: 'mixed' as const,
            label: 'ผสมบทบาท',
            hint: 'ต้องแยกบัญชี',
          },
          ...BASE_FILTERS.slice(2),
        ]
      : BASE_FILTERS

  return (
    <div className="admin-audience-bar" role="tablist" aria-label="กรองประเภทผู้ใช้">
      {filters.map((f) => {
        const isActive = active === f.value
        const count = counts[f.value] ?? 0
        return (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`admin-audience-bar__stage${
              isActive ? ' admin-audience-bar__stage--active' : ''
            }${f.value === 'mixed' ? ' admin-audience-bar__stage--warn' : ''}`}
            onClick={() => onSelect(f.value)}
          >
            <span className="admin-audience-bar__label">{f.label}</span>
            <span className="admin-audience-bar__meta">
              {f.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
