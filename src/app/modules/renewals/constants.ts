import { bangkokTodayIsoDate } from '../../../shared/dates/bangkok'
import type { ContractRenewalStatus } from './types'

export const RENEWAL_STATUS_OPTIONS: { value: ContractRenewalStatus; label: string }[] = [
  { value: 'open', label: 'เปิด — รอติดตาม' },
  { value: 'contacted', label: 'ติดต่อแล้ว' },
  { value: 'quoted', label: 'ส่งใบเสนอราคาแล้ว' },
  { value: 'renewed', label: 'ต่อสัญญาแล้ว' },
  { value: 'declined', label: 'ไม่ต่อ' },
]

export const WITHIN_DAYS_OPTIONS = [
  { value: 30, label: 'ภายใน 30 วัน' },
  { value: 60, label: 'ภายใน 60 วัน' },
  { value: 90, label: 'ภายใน 90 วัน' },
]

export function renewalStatusLabel(status: ContractRenewalStatus | null | undefined): string {
  if (!status) return 'ยังไม่เปิดเคส'
  return RENEWAL_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function daysUntilContractEnd(contractEnd: string | null): number | null {
  if (!contractEnd) return null
  const today = bangkokTodayIsoDate()
  const end = new Date(`${contractEnd}T12:00:00+07:00`)
  const start = new Date(`${today}T12:00:00+07:00`)
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000)
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00+07:00`)
  d.setDate(d.getDate() + days)
  return bangkokTodayIsoDate(d)
}
