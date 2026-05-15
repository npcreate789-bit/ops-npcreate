import { contentStatusLabel } from '../constants'
import type { ContentJobStatus } from '../types'

const CLASS: Record<ContentJobStatus, string> = {
  briefed: 'content-badge--briefed',
  in_production: 'content-badge--production',
  review: 'content-badge--review',
  delivered: 'content-badge--delivered',
  cancelled: 'content-badge--cancelled',
}

export function ContentStatusBadge({ status }: { status: ContentJobStatus }) {
  return (
    <span className={`content-badge ${CLASS[status]}`}>{contentStatusLabel(status)}</span>
  )
}
