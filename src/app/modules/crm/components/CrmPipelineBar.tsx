import type { LeadStatus } from '../types'
import { CRM_PIPELINE_STAGES, pipelineStageIndex } from '../pipeline'
import { statusLabel } from '../constants'

interface CrmPipelineBarProps {
  activeStatus?: LeadStatus | 'all'
  onSelectStatus: (status: LeadStatus | 'all') => void
  counts: Partial<Record<LeadStatus, number>>
}

export function CrmPipelineBar({
  activeStatus = 'all',
  onSelectStatus,
  counts,
}: CrmPipelineBarProps) {
  return (
    <div className="crm-pipeline" role="tablist" aria-label="Pipeline Lead">
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'all'}
        className={`crm-pipeline__stage${activeStatus === 'all' ? ' crm-pipeline__stage--active' : ''}`}
        onClick={() => onSelectStatus('all')}
      >
        <span className="crm-pipeline__label">ทั้งหมด</span>
      </button>
      {CRM_PIPELINE_STAGES.map((stage, index) => {
        const count = counts[stage.status] ?? 0
        const isActive = activeStatus === stage.status
        const currentIdx = activeStatus === 'all' ? -1 : pipelineStageIndex(activeStatus)
        const done = currentIdx >= 0 && index < currentIdx
        return (
          <button
            key={stage.status}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`crm-pipeline__stage${isActive ? ' crm-pipeline__stage--active' : ''}${
              done ? ' crm-pipeline__stage--done' : ''
            }`}
            onClick={() => onSelectStatus(stage.status)}
          >
            <span className="crm-pipeline__label">{stage.label}</span>
            <span className="crm-pipeline__meta">
              {stage.owner}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'follow_up'}
        className={`crm-pipeline__stage crm-pipeline__stage--side${
          activeStatus === 'follow_up' ? ' crm-pipeline__stage--active' : ''
        }`}
        onClick={() => onSelectStatus('follow_up')}
      >
        <span className="crm-pipeline__label">{statusLabel('follow_up')}</span>
        {(counts.follow_up ?? 0) > 0 && (
          <span className="crm-pipeline__meta">· {counts.follow_up}</span>
        )}
      </button>
    </div>
  )
}
