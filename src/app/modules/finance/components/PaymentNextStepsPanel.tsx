import { Link } from 'react-router-dom'
import type { Payment } from '../types'
import { buildPaymentNextSteps, type FinanceNextStep } from '../pipeline'
import { paymentStatusLabel } from '../constants'

interface PaymentNextStepsPanelProps {
  payment: Payment
  /** Lead id ที่ผูกผ่านใบเสนอราคา — render ปุ่ม "Lead ต้นทาง" */
  leadId?: string | null
  /** ชื่อแบรนด์จาก Lead — แสดงเป็น detail ของปุ่ม Lead */
  leadBrandName?: string | null
}

export function PaymentNextStepsPanel({
  payment,
  leadId,
  leadBrandName,
}: PaymentNextStepsPanelProps) {
  const base = buildPaymentNextSteps(payment)
  const steps: FinanceNextStep[] = [...base]

  if (leadId) {
    const insertAt = base.findIndex((s) => s.path.startsWith('/app/sales/quotations'))
    const leadStep: FinanceNextStep = {
      label: 'Lead ต้นทาง',
      path: `/app/crm/${leadId}`,
      detail: leadBrandName ? `CRM · ${leadBrandName}` : 'CRM',
    }
    if (insertAt >= 0) {
      steps.splice(insertAt + 1, 0, leadStep)
    } else {
      steps.unshift(leadStep)
    }
  }

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
