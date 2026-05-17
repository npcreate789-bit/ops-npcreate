import { AUDIT_ACTION_GROUPS } from '../../../../shared/audit/actionLabels'
import { ACTIVITY_CATEGORY_ALL, type ActivityCategoryFilter } from '../pipeline'

interface ActivityCategoryFilterBarProps {
  active: ActivityCategoryFilter
  onSelect: (category: ActivityCategoryFilter) => void
  counts: Partial<Record<ActivityCategoryFilter, number>>
  hideSensitive?: boolean
}

export function ActivityCategoryFilterBar({
  active,
  onSelect,
  counts,
  hideSensitive,
}: ActivityCategoryFilterBarProps) {
  const groups = AUDIT_ACTION_GROUPS.filter((g) =>
    hideSensitive ? g.value !== 'user' && g.value !== 'client_access' : true,
  )

  return (
    <div className="activity-category-bar" role="tablist" aria-label="กรองหมวดกิจกรรม">
      {groups.map((g) => {
        const value = g.value
        const count = counts[value] ?? 0
        const isActive = active === value
        return (
          <button
            key={value || 'all'}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`activity-category-bar__stage${
              isActive ? ' activity-category-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(value)}
          >
            <span className="activity-category-bar__label">{g.label}</span>
            {value === ACTIVITY_CATEGORY_ALL ? (
              <span className="activity-category-bar__meta">ล่าสุด 200 รายการ</span>
            ) : (
              <span className="activity-category-bar__meta">
                {count > 0 ? `${count} รายการ` : '—'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
