import { renewalStatusBadgeClass, renewalStatusBadgeLabel } from '../pipeline'
import type { ContractRenewalStatus } from '../types'

export function RenewalStatusBadge({
  status,
}: {
  status: ContractRenewalStatus | null | undefined
}) {
  return (
    <span className={renewalStatusBadgeClass(status)}>{renewalStatusBadgeLabel(status)}</span>
  )
}
