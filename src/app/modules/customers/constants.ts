import type { CustomerStatus, CustomerTimelineKind } from './types'

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

export const CUSTOMER_TIMELINE_KIND_OPTIONS: {
  value: CustomerTimelineKind | ''
  label: string
}[] = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'task', label: 'งานภายใน' },
  { value: 'payment', label: 'การเงิน' },
  { value: 'content', label: 'คอนเทนต์' },
  { value: 'contract', label: 'สัญญา' },
  { value: 'activity', label: 'กิจกรรมระบบ' },
  { value: 'lead', label: 'Lead' },
]

export const CUSTOMER_TIMELINE_WITHIN_OPTIONS = [
  { value: 14, label: 'ล่วงหน้า 14 วัน' },
  { value: 30, label: 'ล่วงหน้า 30 วัน' },
  { value: 60, label: 'ล่วงหน้า 60 วัน' },
]

export const CUSTOMER_TIMELINE_LOOKBACK_OPTIONS = [
  { value: 30, label: 'ย้อนหลัง 30 วัน' },
  { value: 90, label: 'ย้อนหลัง 90 วัน' },
  { value: 180, label: 'ย้อนหลัง 180 วัน' },
]

export function customerTimelineKindLabel(kind: CustomerTimelineKind): string {
  return CUSTOMER_TIMELINE_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind
}
