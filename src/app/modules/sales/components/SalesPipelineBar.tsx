import type { QuotationStatus } from '../types'
import { PIPELINE_STAGES, quotationStatusLabel } from '../constants'
import { salesPipelineIndex } from '../pipeline'

interface SalesPipelineBarProps {
  activeStatus?: QuotationStatus | 'all'
  onSelectStatus: (status: QuotationStatus | 'all') => void
  counts: Partial<Record<QuotationStatus, number>>
}

export function SalesPipelineBar({
  activeStatus = 'all',
  onSelectStatus,
  counts,
}: SalesPipelineBarProps) {
  const activeIdx =
    activeStatus === 'all' ? -1 : salesPipelineIndex(activeStatus)

  return (
    <div className="sales-pipeline-bar" role="tablist" aria-label="Pipeline ใบเสนอราคา">
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'all'}
        className={`sales-pipeline-bar__stage${
          activeStatus === 'all' ? ' sales-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelectStatus('all')}
      >
        <span className="sales-pipeline-bar__label">ทั้งหมด</span>
      </button>
      {PIPELINE_STAGES.map((stage, index) => {
        const count = counts[stage.status] ?? 0
        const isActive = activeStatus === stage.status
        const done = activeIdx >= 0 && index < activeIdx
        return (
          <button
            key={stage.status}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`sales-pipeline-bar__stage${isActive ? ' sales-pipeline-bar__stage--active' : ''}${
              done ? ' sales-pipeline-bar__stage--done' : ''
            }`}
            onClick={() => onSelectStatus(stage.status)}
          >
            <span className="sales-pipeline-bar__label">{stage.label}</span>
            {count > 0 ? (
              <span className="sales-pipeline-bar__count">{count}</span>
            ) : null}
          </button>
        )
      })}
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'cancelled'}
        className={`sales-pipeline-bar__stage sales-pipeline-bar__stage--side${
          activeStatus === 'cancelled' ? ' sales-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelectStatus('cancelled')}
      >
        <span className="sales-pipeline-bar__label">{quotationStatusLabel('cancelled')}</span>
        {(counts.cancelled ?? 0) > 0 && (
          <span className="sales-pipeline-bar__count">{counts.cancelled}</span>
        )}
      </button>
    </div>
  )
}
