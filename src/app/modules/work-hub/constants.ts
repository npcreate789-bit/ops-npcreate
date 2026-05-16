import type { WorkHubFilters, WorkItemKind } from './types'

export const WORK_WITHIN_OPTIONS = [
  { value: 7, label: '7 วัน' },
  { value: 14, label: '14 วัน' },
  { value: 30, label: '30 วัน' },
] as const

export const WORK_LOOKBACK_OPTIONS = [
  { value: 14, label: '14 วัน' },
  { value: 30, label: '30 วัน' },
  { value: 60, label: '60 วัน' },
] as const

export const DEFAULT_WORK_HUB_FILTERS: WorkHubFilters = {
  within_days: 30,
  lookback_days: 30,
  kind: '',
  view: 'all',
}

export const WORK_KIND_OPTIONS: { value: WorkItemKind | ''; label: string }[] = [
  { value: '', label: 'ทุกประเภท' },
  { value: 'task', label: 'งานภายใน' },
  { value: 'contract_end', label: 'สัญญา' },
  { value: 'lead_reminder', label: 'Lead' },
  { value: 'payment_due', label: 'การเงิน' },
  { value: 'notification', label: 'แจ้งเตือน' },
]

export function workKindLabel(kind: WorkItemKind): string {
  const row = WORK_KIND_OPTIONS.find((o) => o.value === kind)
  return row?.label ?? kind
}
