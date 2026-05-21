import {
  buildPublicQuotationProgressSteps,
  type PublicQuotationProgressStep,
} from '../publicPaymentFlow'
import type { PublicQuotation } from '../types'

export function PublicQuotationProgressStepper({ data }: { data: PublicQuotation }) {
  const steps = buildPublicQuotationProgressSteps(data)

  return (
    <nav className="public-qt-stepper" aria-label="ขั้นตอนการชำระเงิน">
      <ol className="public-qt-stepper__list">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`public-qt-stepper__item public-qt-stepper__item--${step.state}`}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            <StepNode step={step} index={index + 1} isLast={index === steps.length - 1} />
          </li>
        ))}
      </ol>
    </nav>
  )
}

function StepNode({
  step,
  index,
  isLast,
}: {
  step: PublicQuotationProgressStep
  index: number
  isLast: boolean
}) {
  return (
    <div className="public-qt-stepper__node">
      <span className="public-qt-stepper__marker" aria-hidden>
        {step.state === 'done' ? (
          <span className="public-qt-stepper__check">✓</span>
        ) : step.state === 'current' ? (
          <span className="public-qt-stepper__pulse" />
        ) : (
          <span className="public-qt-stepper__num">{index}</span>
        )}
      </span>
      <span className="public-qt-stepper__label">{step.label}</span>
      {!isLast ? <span className="public-qt-stepper__rail" aria-hidden /> : null}
    </div>
  )
}
