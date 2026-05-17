import type { AdminAudienceFilter } from '../userAudience'

const FILTERS: { value: AdminAudienceFilter; label: string; hint: string }[] = [
  { value: 'staff', label: 'พนักงาน', hint: 'ทีมภายใน' },
  { value: 'client', label: 'ลูกค้า (พอร์ทัล)', hint: 'บัญชีแบรนด์' },
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
  return (
    <div className="admin-audience-bar" role="tablist" aria-label="กรองประเภทผู้ใช้">
      {FILTERS.map((f) => {
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
            }`}
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
