import type { CampaignStatus } from './types'

export const CAMPAIGN_STATUS_OPTIONS: { value: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'ใช้งานปกติ' },
  { value: 'budget_unused', label: 'งบไม่ใช้' },
  { value: 'low_roi', label: 'ROI ตก' },
  { value: 'needs_fix', label: 'ต้องแก้ด่วน' },
  { value: 'paused', label: 'หยุดชั่วคราว' },
]

export function campaignStatusLabel(s: CampaignStatus): string {
  return CAMPAIGN_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
}

import { BANGKOK_TZ, bangkokTodayIsoDate } from '../../../shared/dates/bangkok'

export function todayIsoDate(): string {
  return bangkokTodayIsoDate()
}

export function yesterdayIsoDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return bangkokTodayIsoDate(d)
}

/** เวลาส่งรายงานจริง ณ ตอนบันทึก */
export function reportedAtNow(): string {
  return new Date().toISOString()
}

const bangkokFormatOpts = { timeZone: BANGKOK_TZ, hour12: false } as const

/** เวลารายงาน (HH:mm) จาก reported_at */
export function formatReportTime(reportedAt?: string | null): string {
  if (!reportedAt) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    ...bangkokFormatOpts,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(reportedAt))
}

/** วันเวลาส่งรายงานจริง (Asia/Bangkok) */
export function formatReportedAt(reportedAt: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    ...bangkokFormatOpts,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(reportedAt))
    .replace(',', '')
}

/** วันที่รายงาน + เวลาที่ส่งจริง */
export function formatReportDateTime(
  reportDate: string,
  reportedAt?: string | null,
): string {
  if (!reportedAt) return reportDate
  return `${reportDate} ${formatReportTime(reportedAt)}`
}

/** Parse optional numeric fields; empty → 0 for calculations. */
export function parseAmountField(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Parse required numeric fields; empty → null. */
export function parseRequiredAmountField(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Parse optional integer fields; empty → 0 for calculations. */
export function parseIntField(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return 0
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

/** Parse required integer fields; empty → null. */
export function parseRequiredIntField(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null
  return n
}

export type AdsReportFieldKey = 'reportDate' | 'spend' | 'gmv' | 'orders' | 'skuLines'

export type AdsReportFieldErrors = Partial<Record<AdsReportFieldKey, string>>

export interface AdsReportValidatedValues {
  spend: number
  gmv: number
  orders: number
}

export function validateAdsReportFields(input: {
  reportDate: string
  spendTotal: number
  gmvTotal: number
  ordersTotal: number
  skuLineError?: string | null
}): { errors: AdsReportFieldErrors; values: AdsReportValidatedValues | null } {
  const errors: AdsReportFieldErrors = {}
  const today = todayIsoDate()

  if (input.skuLineError) {
    errors.skuLines = input.skuLineError
  }

  if (!input.reportDate.trim()) {
    errors.reportDate = 'กรุณาระบุวันที่รายงาน'
  } else if (input.reportDate > today) {
    errors.reportDate = 'กรุณาเลือกวันที่รายงานไม่เกินวันนี้'
  }

  let spend: number | null = null
  if (input.spendTotal <= 0) {
    errors.spend =
      'กรุณาระบุ SKU และค่าใช้จ่ายอย่างน้อย 1 รายการ (รวม Spend ต้องมากกว่า 0)'
  } else {
    spend = input.spendTotal
  }

  let gmv: number | null = null
  if (input.gmvTotal <= 0) {
    errors.gmv = 'กรุณาระบุ GMV ในแถว SKU อย่างน้อย 1 รายการ (รวม GMV ต้องมากกว่า 0)'
  } else {
    gmv = input.gmvTotal
  }

  let orders: number | null = null
  if (input.ordersTotal <= 0) {
    errors.orders =
      'กรุณาระบุออเดอร์ในแถว SKU อย่างน้อย 1 รายการ (รวมออเดอร์ต้องมากกว่า 0)'
  } else {
    orders = input.ordersTotal
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: null }
  }

  return {
    errors,
    values: {
      spend: spend!,
      gmv: gmv!,
      orders: orders!,
    },
  }
}

export function calcRoi(spend: number, gmv: number): number | null {
  if (spend <= 0) return null
  return Math.round((gmv / spend) * 100) / 100
}

export function calcCpa(spend: number, orders: number): number | null {
  if (orders <= 0) return null
  return Math.round((spend / orders) * 100) / 100
}
