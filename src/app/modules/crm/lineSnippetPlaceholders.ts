import {
  formatServiceInterests,
  type ServicePackageOption,
} from '../../../shared/packages/serviceInterests'
import type { Lead } from './types'

export interface LineSnippetPlaceholderContext {
  brand_name?: string | null
  contact_name?: string | null
  phone?: string | null
  business_type?: string | null
  ad_budget_monthly?: number | null
  services_interested?: string[]
  serviceOptions?: ServicePackageOption[]
}

export const LINE_SNIPPET_PLACEHOLDERS: {
  key: string
  label: string
  example: string
}[] = [
  { key: 'brand_name', label: 'ชื่อร้าน / แบรนด์', example: 'ร้าน ABC' },
  { key: 'contact_name', label: 'ชื่อผู้ติดต่อ', example: 'คุณสมชาย' },
  { key: 'phone', label: 'เบอร์โทร', example: '0812345678' },
  { key: 'ad_budget', label: 'งบแอด / เดือน (บาท)', example: '20,000' },
  { key: 'business_type', label: 'ประเภทธุรกิจ', example: 'อาหาร' },
  { key: 'services', label: 'บริการที่สนใจ', example: 'ดูแล GMV Max' },
]

const PLACEHOLDER_PATTERN = /\{([a-z_]+)\}/g

function formatAdBudget(monthly: number | null | undefined): string {
  if (monthly == null || Number.isNaN(monthly)) return ''
  return monthly.toLocaleString('th-TH', { maximumFractionDigits: 0 })
}

function resolvePlaceholder(
  key: string,
  ctx: LineSnippetPlaceholderContext,
): string | null {
  switch (key) {
    case 'brand_name':
      return ctx.brand_name?.trim() || ctx.contact_name?.trim() || ''
    case 'contact_name':
      return ctx.contact_name?.trim() || ctx.brand_name?.trim() || ''
    case 'phone':
      return ctx.phone?.trim() || ''
    case 'ad_budget':
      return formatAdBudget(ctx.ad_budget_monthly)
    case 'business_type':
      return ctx.business_type?.trim() || ''
    case 'services':
      if (!ctx.services_interested?.length) return ''
      return formatServiceInterests(ctx.services_interested, ctx.serviceOptions ?? [])
    default:
      return null
  }
}

/** แทนที่ {brand_name} ฯลฯ จากข้อมูล Lead ปัจจุบัน */
export function applyLineSnippetPlaceholders(
  template: string,
  ctx: LineSnippetPlaceholderContext,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    const value = resolvePlaceholder(key, ctx)
    if (value === null) return match
    return value
  })
}

export function leadToSnippetPlaceholderContext(
  lead: Lead,
  serviceOptions: ServicePackageOption[] = [],
): LineSnippetPlaceholderContext {
  return {
    brand_name: lead.brand_name,
    contact_name: lead.contact_name,
    phone: lead.phone,
    business_type: lead.business_type,
    ad_budget_monthly: lead.ad_budget_monthly,
    services_interested: lead.services_interested,
    serviceOptions,
  }
}

/** มี placeholder ที่ยังว่างหลังแทนค่า (สำหรับแจ้งเตือนเล็กน้อย) */
export function lineSnippetPlaceholderWarnings(
  text: string,
  ctx: LineSnippetPlaceholderContext,
): string[] {
  const resolved = applyLineSnippetPlaceholders(text, ctx)
  const warnings: string[] = []
  if (/\{[a-z_]+\}/.test(resolved)) {
    warnings.push('ยังมีตัวแปรที่ระบบไม่รู้จัก — ตรวจก่อนส่ง')
  }
  if (text.includes('{contact_name}') && !ctx.contact_name?.trim() && !ctx.brand_name?.trim()) {
    warnings.push('ไม่มีชื่อผู้ติดต่อ — กรอกในฟอร์ม Lead')
  }
  if (text.includes('{phone}') && !ctx.phone?.trim()) {
    warnings.push('ไม่มีเบอร์โทรใน Lead')
  }
  return warnings
}
