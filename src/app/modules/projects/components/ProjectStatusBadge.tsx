import type { ProjectStatus } from '../types'
import { projectStatusLabel } from '../constants'
import { getProjectPipelineStage } from '../pipeline'

const CLASS: Record<ReturnType<typeof getProjectPipelineStage>, string> = {
  kickoff: 'project-badge--kickoff',
  active: 'project-badge--active',
  done: 'project-badge--done',
  closed: 'project-badge--closed',
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const stage = getProjectPipelineStage(status)
  return (
    <span className={`project-badge ${CLASS[stage]}`}>{projectStatusLabel(status)}</span>
  )
}
