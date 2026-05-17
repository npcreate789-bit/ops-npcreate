import { Link } from 'react-router-dom'
import type { Lead } from '../types'
import { buildLeadNextSteps } from '../pipeline'
import { statusLabel } from '../constants'

interface LeadNextStepsPanelProps {
  lead: Lead
}

export function LeadNextStepsPanel({ lead }: LeadNextStepsPanelProps) {
  const steps = buildLeadNextSteps(lead)
  if (steps.length === 0) return null

  return (
    <section className="card card--wide crm-next-steps" aria-label="ขั้นถัดไป">
      <header className="crm-next-steps__head">
        <h2>ขั้นถัดไป</h2>
        <span className="muted">
          สถานะ: {statusLabel(lead.status)} · เชื่อมกับทีมและ Client Workspace
        </span>
      </header>
      <ul className="crm-next-steps__list">
        {steps.map((step) => (
          <li key={step.path + step.label}>
            <Link
              to={step.path}
              className={`crm-next-steps__link${step.primary ? ' crm-next-steps__link--primary' : ''}`}
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
