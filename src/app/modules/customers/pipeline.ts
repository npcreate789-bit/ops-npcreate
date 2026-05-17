import type { CustomerListRow, CustomerStatus } from './types'

export type CustomerBriefFilter = 'all' | 'awaiting_brief' | 'ready_for_ads'

export const CUSTOMER_BRIEF_FILTERS: {
  value: CustomerBriefFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'ลูกค้าที่มองเห็น' },
  { value: 'awaiting_brief', label: 'รอบรีฟ', hint: 'ยังไม่พร้อมยิงแอด' },
  { value: 'ready_for_ads', label: 'พร้อมยิงแอด', hint: 'checklist ทีมครบ' },
]

export function matchesBriefFilter(
  row: CustomerListRow,
  filter: CustomerBriefFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'ready_for_ads') return row.ready_for_ads
  return !row.ready_for_ads
}

export function customerBriefStageLabel(row: CustomerListRow): string {
  if (row.status === 'ended') return 'สิ้นสุดสัญญา'
  if (row.status === 'at_risk') return 'เสี่ยง'
  if (row.ready_for_ads) return 'พร้อมยิงแอด'
  return 'รอบรีฟ / checklist'
}

export function customerBriefStageClass(row: CustomerListRow): string {
  if (row.status === 'ended') return 'customers-stage-badge--ended'
  if (row.status === 'at_risk') return 'customers-stage-badge--risk'
  if (row.ready_for_ads) return 'customers-stage-badge--ready'
  return 'customers-stage-badge--brief'
}

export function customerStatusLabelTh(status: CustomerStatus): string {
  switch (status) {
    case 'pending':
      return 'รอเปิดใช้'
    case 'active':
      return 'ใช้งานอยู่'
    case 'at_risk':
      return 'เสี่ยง'
    case 'ended':
      return 'สิ้นสุด'
    default:
      return status
  }
}
