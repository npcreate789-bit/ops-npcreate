import { renewalStatusLabel } from './constants'
import type { ContractRenewalStatus, RenewalRow } from './types'

export type RenewalPipelineFilter =
  | 'all'
  | 'no_case'
  | 'urgent'
  | 'in_progress'
  | 'renewed'
  | 'declined'
  | 'expired'

export const RENEWAL_PIPELINE_FILTERS: {
  value: RenewalPipelineFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'ในช่วงที่เลือก' },
  { value: 'no_case', label: 'ยังไม่เปิดเคส', hint: 'ต้องเริ่มติดตาม' },
  { value: 'urgent', label: 'เร่งด่วน ≤14 วัน', hint: 'สัญญาใกล้หมด' },
  { value: 'in_progress', label: 'กำลังติดตาม', hint: 'เปิดเคสแล้ว' },
  { value: 'renewed', label: 'ต่อแล้ว', hint: 'ปิดเคสต่อสัญญา' },
  { value: 'declined', label: 'ไม่ต่อ', hint: 'ปิดเคสไม่ต่อ' },
  { value: 'expired', label: 'หมดอายุแล้ว', hint: 'เลยวันสิ้นสัญญา' },
]

export function matchesRenewalPipeline(
  row: RenewalRow,
  filter: RenewalPipelineFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'no_case') return row.renewal_status == null
  if (filter === 'urgent') {
    return row.days_until_end != null && row.days_until_end >= 0 && row.days_until_end <= 14
  }
  if (filter === 'in_progress') {
    const s = row.renewal_status
    return s === 'open' || s === 'contacted' || s === 'quoted'
  }
  if (filter === 'renewed') return row.renewal_status === 'renewed'
  if (filter === 'declined') return row.renewal_status === 'declined'
  if (filter === 'expired') return row.days_until_end != null && row.days_until_end < 0
  return true
}

export function renewalStatusBadgeClass(
  status: ContractRenewalStatus | null | undefined,
): string {
  if (!status) return 'renewal-badge renewal-badge--none'
  return `renewal-badge renewal-badge--${status}`
}

export function renewalStatusBadgeLabel(
  status: ContractRenewalStatus | null | undefined,
): string {
  return renewalStatusLabel(status)
}
