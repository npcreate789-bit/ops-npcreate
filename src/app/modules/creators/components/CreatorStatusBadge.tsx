import { creatorStatusLabel } from '../constants'
import { creatorStatusClass } from '../pipeline'
import type { CreatorStatus } from '../types'

export function CreatorStatusBadge({ status }: { status: CreatorStatus }) {
  return <span className={creatorStatusClass(status)}>{creatorStatusLabel(status)}</span>
}
