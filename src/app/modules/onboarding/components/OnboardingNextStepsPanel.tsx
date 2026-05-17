import { Link } from 'react-router-dom'
import type { OnboardingDetail } from '../types'
import { buildOnboardingNextSteps, customerStatusLabelTh, getOnboardingStage } from '../pipeline'
import { ONBOARDING_PIPELINE_STAGES } from '../pipeline'

interface OnboardingNextStepsPanelProps {
  detail: OnboardingDetail
  clientSubmitted?: boolean
}

export function OnboardingNextStepsPanel({
  detail,
  clientSubmitted,
}: OnboardingNextStepsPanelProps) {
  const stage = getOnboardingStage(detail.customer)
  const stageLabel = ONBOARDING_PIPELINE_STAGES.find((s) => s.stage === stage)?.label ?? stage
  const steps = buildOnboardingNextSteps(detail, { clientSubmitted })

  return (
    <section className="card card--wide onboarding-next-steps" aria-label="ขั้นถัดไป">
      <header className="onboarding-next-steps__head">
        <h2>ขั้นถัดไป</h2>
        <span className="muted">
          {stageLabel} · {customerStatusLabelTh(detail.customer.status)} · ความครบ{' '}
          {detail.customer.progress}%
        </span>
      </header>
      <ul className="onboarding-next-steps__list">
        {steps.map((step) => {
          const isHash = step.path.startsWith('#')
          const className = `onboarding-next-steps__link${
            step.primary ? ' onboarding-next-steps__link--primary' : ''
          }`
          return (
            <li key={step.path + step.label}>
              {isHash ? (
                <a href={step.path} className={className}>
                  <strong>{step.label}</strong>
                  <span className="muted">{step.detail}</span>
                </a>
              ) : (
                <Link to={step.path} className={className}>
                  <strong>{step.label}</strong>
                  <span className="muted">{step.detail}</span>
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
