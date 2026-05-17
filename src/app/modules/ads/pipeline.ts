import type { AdsCustomerRow } from './types'

export type AdsReportFilter = 'all' | 'pending' | 'submitted' | 'unassigned'

export const ADS_REPORT_FILTERS: {
  value: AdsReportFilter
  label: string
  hint: string
}[] = [
  { value: 'all', label: 'ทั้งหมด', hint: 'ลูกค้าพร้อมยิงแอด' },
  { value: 'pending', label: 'ยังไม่ส่งวันนี้', hint: 'ต้องบันทึกรายงาน' },
  { value: 'submitted', label: 'ส่งแล้ววันนี้', hint: 'บันทึกครบแล้ว' },
  { value: 'unassigned', label: 'รอมอบหมาย', hint: 'ยังไม่มี Ads owner' },
]

export function matchesAdsFilter(row: AdsCustomerRow, filter: AdsReportFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'unassigned') return !row.ads_owner_id
  if (filter === 'submitted') return Boolean(row.ads_owner_id && row.today_submitted)
  return Boolean(row.ads_owner_id && !row.today_submitted)
}

export function adsReportStatusLabel(row: AdsCustomerRow): string {
  if (!row.ads_owner_id) return 'รอมอบหมาย'
  if (row.today_submitted) return 'ส่งแล้ววันนี้'
  return 'ยังไม่ส่งวันนี้'
}

export function adsReportStatusClass(row: AdsCustomerRow): string {
  if (!row.ads_owner_id) return 'ads-report-status--unassigned'
  if (row.today_submitted) return 'ads-report-status--done'
  return 'ads-report-status--pending'
}
