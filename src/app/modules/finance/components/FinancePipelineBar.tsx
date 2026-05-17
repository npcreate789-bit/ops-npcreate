import type { PaymentStatus } from '../types'
import { FINANCE_PIPELINE_STAGES } from '../pipeline'
import { paymentStatusLabel } from '../constants'

interface FinancePipelineBarProps {
  activeStatus?: PaymentStatus | 'all' | 'overdue'
  onSelectStatus: (status: PaymentStatus | 'all' | 'overdue') => void
  counts: Partial<Record<PaymentStatus | 'overdue', number>>
}

export function FinancePipelineBar({
  activeStatus = 'all',
  onSelectStatus,
  counts,
}: FinancePipelineBarProps) {
  return (
    <div className="finance-pipeline-bar" role="tablist" aria-label="สถานะการชำระเงิน">
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'all'}
        className={`finance-pipeline-bar__stage${
          activeStatus === 'all' ? ' finance-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelectStatus('all')}
      >
        <span className="finance-pipeline-bar__label">ทั้งหมด</span>
      </button>
      {FINANCE_PIPELINE_STAGES.map((stage) => {
        const count = counts[stage.status] ?? 0
        const isActive = activeStatus === stage.status
        return (
          <button
            key={stage.status}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`finance-pipeline-bar__stage${
              isActive ? ' finance-pipeline-bar__stage--active' : ''
            }`}
            onClick={() => onSelectStatus(stage.status)}
          >
            <span className="finance-pipeline-bar__label">{stage.label}</span>
            <span className="finance-pipeline-bar__meta">
              {stage.owner}
              {count > 0 ? ` · ${count}` : ''}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'overdue'}
        className={`finance-pipeline-bar__stage finance-pipeline-bar__stage--alert${
          activeStatus === 'overdue' ? ' finance-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelectStatus('overdue')}
      >
        <span className="finance-pipeline-bar__label">เกินกำหนด</span>
        {(counts.overdue ?? 0) > 0 && (
          <span className="finance-pipeline-bar__count">{counts.overdue}</span>
        )}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeStatus === 'cancelled'}
        className={`finance-pipeline-bar__stage finance-pipeline-bar__stage--side${
          activeStatus === 'cancelled' ? ' finance-pipeline-bar__stage--active' : ''
        }`}
        onClick={() => onSelectStatus('cancelled')}
      >
        <span className="finance-pipeline-bar__label">{paymentStatusLabel('cancelled')}</span>
        {(counts.cancelled ?? 0) > 0 && (
          <span className="finance-pipeline-bar__count">{counts.cancelled}</span>
        )}
      </button>
    </div>
  )
}
