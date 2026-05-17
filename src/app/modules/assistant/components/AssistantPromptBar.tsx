import type { StaffPromptKey } from '../types'

interface PromptOption {
  value: StaffPromptKey
  label: string
  hint: string
}

interface AssistantPromptBarProps {
  options: PromptOption[]
  active: StaffPromptKey
  onSelect: (key: StaffPromptKey) => void
}

export function AssistantPromptBar({ options, active, onSelect }: AssistantPromptBarProps) {
  if (options.length <= 1) return null

  return (
    <div className="assistant-prompt-bar" role="tablist" aria-label="เลือกเทมเพลต">
      {options.map((o) => {
        const isActive = active === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`assistant-prompt-bar__stage${
              isActive ? ' assistant-prompt-bar__stage--active' : ''
            }`}
            onClick={() => onSelect(o.value)}
          >
            <span className="assistant-prompt-bar__label">{o.label}</span>
            <span className="assistant-prompt-bar__meta">{o.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
