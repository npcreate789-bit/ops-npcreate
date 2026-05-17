import { Link } from 'react-router-dom'
import type { Payment } from '../types'
import { buildPaymentNextSteps } from '../pipeline'
import { paymentStatusLabel } from '../constants'

interface PaymentNextStepsPanelProps {
  payment: Payment
}

export function PaymentNextStepsPanel({ payment }: PaymentNextStepsPanelProps) {
  const steps = buildPaymentNextSteps(payment)
  if (steps.length === 0) return null

  return (
    <section className="card card--wide finance-next-steps" aria-label="ขั้นถัดไป">
      <header className="finance-next-steps__head">
        <h2>ขั้นถัดไป</h2>
        <span className="muted">
          สถานะ: {paymentStatusLabel(payment.status)} · เชื่อม Sales · Onboarding · Client Workspace
        </span>
      </header>
      <ul className="finance-next-steps__list">
        {steps.map((step) => (
          <li key={step.path + step.label}>
            <Link
              to={step.path}
              className={`finance-next-steps__link${
                step.primary ? ' finance-next-steps__link--primary' : ''
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
