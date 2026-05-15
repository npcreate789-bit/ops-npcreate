import type { CustomerStatus } from './types'

export const CUSTOMER_STATUS_OPTIONS: { value: CustomerStatus | ''; label: string }[] = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'active', label: 'Active' },
  { value: 'at_risk', label: 'เสี่ยง' },
  { value: 'ended', label: 'สิ้นสุด' },
]

export function customerStatusLabel(status: CustomerStatus): string {
  return CUSTOMER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}
