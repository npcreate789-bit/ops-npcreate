import type { OnboardingFilter } from '../pipeline'
import { ONBOARDING_PIPELINE_STAGES } from '../pipeline'

interface OnboardingPipelineBarProps {
  active: OnboardingFilter
  onSelect: (filter: OnboardingFilter) => void
  counts: Partial<Record<OnboardingFilter, number>>
}

export function OnboardingPipelineBar({ active, onSelect, counts }: OnboardingPipelineBarProps) {
  const total = counts.all ?? 0

  return (
    <div className="onboarding-pipeline-bar" role="tablist" aria-label="ขั้นตอนรับบรีฟ">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        className={`onboarding-pipeline-bar__stage${
          active === 'all' ? ' onboarding-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelect('all')}
      >
        <span className="onboarding-pipeline-bar__label">ทั้งหมด</span>
        {total > 0 && <span className="onboarding-pipeline-bar__meta">{total}</span>}
      </button>
      {ONBOARDING_PIPELINE_STAGES.map((s) => {
        const count = counts[s.stage] ?? 0
        const isActive = active === s.stage
        return (
          <button
            key={s.stage}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`onboarding-pipeline-bar__stage${
              isActive ? ' onboarding-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(s.stage)}
          >
            <span className="onboarding-pipeline-bar__label">{s.label}</span>
            <span className="onboarding-pipeline-bar__meta">
              {s.hint}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
