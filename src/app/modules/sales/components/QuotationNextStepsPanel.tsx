import { Link } from 'react-router-dom'
import type { Quotation } from '../types'
import { buildQuotationNextSteps } from '../pipeline'
import { quotationStatusLabel } from '../constants'

interface QuotationNextStepsPanelProps {
  quotation: Quotation
}

export function QuotationNextStepsPanel({ quotation }: QuotationNextStepsPanelProps) {
  const steps = buildQuotationNextSteps(quotation)
  if (steps.length === 0) return null

  return (
    <section className="card card--wide sales-next-steps no-print" aria-label="ขั้นถัดไป">
      <header className="sales-next-steps__head">
        <h2>ขั้นถัดไป</h2>
        <span className="muted">
          สถานะ: {quotationStatusLabel(quotation.status)} · เชื่อม CRM · Finance · Client Workspace
        </span>
      </header>
      <ul className="sales-next-steps__list">
        {steps.map((step) => (
          <li key={step.path + step.label}>
            <Link
              to={step.path}
              className={`sales-next-steps__link${
                step.primary ? ' sales-next-steps__link--primary' : ''
              }`}
            >
              <strong>{step.label}</strong>
              <span className="muted">{step.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
