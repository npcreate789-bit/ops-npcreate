import { Link } from 'react-router-dom'
import type { Project } from '../types'
import { buildProjectNextSteps } from '../pipeline'
import { projectStatusLabel } from '../constants'

interface ProjectNextStepsPanelProps {
  project: Project
}

export function ProjectNextStepsPanel({ project }: ProjectNextStepsPanelProps) {
  const steps = buildProjectNextSteps(project)
  if (steps.length === 0) return null

  return (
    <section className="card card--wide projects-next-steps no-print" aria-label="ขั้นถัดไป">
      <header className="projects-next-steps__head">
        <h2>ขั้นถัดไป</h2>
        <span className="muted">
          {projectStatusLabel(project.status)} · {project.progress}% · เชื่อม Tasks · แชท · ลูกค้า
        </span>
      </header>
      <ul className="projects-next-steps__list">
        {steps.map((step) => (
          <li key={step.path + step.label}>
            <Link
              to={step.path}
              className={`projects-next-steps__link${
                step.primary ? ' projects-next-steps__link--primary' : ''
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
