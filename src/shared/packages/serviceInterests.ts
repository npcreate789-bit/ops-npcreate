/** แพ็กเกจบริการ — รหัส (code) เป็นแหล่งความจริงเดียวใน contact / CRM / ใบเสนอราคา */

export interface ServicePackageOption {
  code: string
  name: string
}

/** ตรงกับ supabase/migrations/00065_seed_sales_packages.sql — fallback เมื่อโหลดจาก DB ไม่ได้ */
export const DEFAULT_ACTIVE_SERVICE_PACKAGES: ServicePackageOption[] = [
  { code: 'gmv_max', name: 'ดูแล GMV Max' },
  { code: 'gmv_course', name: 'คอร์ส GMV Max' },
  { code: 'tiktok_one', name: 'TikTok One / Creator' },
  { code: 'content', name: 'ผลิตคอนเทนต์' },
  { code: 'live', name: 'Live Commerce' },
  { code: 'consulting', name: 'Private Consulting' },
  { code: 'software', name: 'Software / License' },
  { code: 'other', name: 'บริการอื่น ๆ' },
]

/** ป้ายเก่าจาก SERVICE_PACKAGES / ข้อมูลก่อนรวมรหัส */
const LEGACY_LABEL_TO_CODE: Record<string, string> = {
  'GMV Max': 'gmv_max',
  'ดูแล GMV Max': 'gmv_max',
  'คอร์ส GMV Max': 'gmv_course',
  'TikTok One / Creator': 'tiktok_one',
  'ผลิตคอนเทนต์': 'content',
  'Live Commerce': 'live',
  'Private Consulting': 'consulting',
  'Software / License': 'software',
  'บริการอื่น ๆ': 'other',
}

function knownCodes(options: ServicePackageOption[]): Set<string> {
  return new Set(options.map((o) => o.code))
}

/** แปลงค่าใน DB (รหัสหรือป้ายเก่า) เป็นรหัสแพ็กเกจ */
export function normalizeServiceInterestCode(
  value: string,
  options: ServicePackageOption[] = DEFAULT_ACTIVE_SERVICE_PACKAGES,
): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const codes = knownCodes(options)
  if (codes.has(trimmed)) return trimmed
  const legacy = LEGACY_LABEL_TO_CODE[trimmed]
  if (legacy && codes.has(legacy)) return legacy
  const byName = options.find((o) => o.name === trimmed)
  if (byName) return byName.code
  return legacy ?? trimmed
}

export function normalizeServiceInterestCodes(
  values: string[],
  options: ServicePackageOption[] = DEFAULT_ACTIVE_SERVICE_PACKAGES,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const code = normalizeServiceInterestCode(v, options)
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push(code)
  }
  return out
}

export function serviceInterestLabel(
  code: string,
  options: ServicePackageOption[] = DEFAULT_ACTIVE_SERVICE_PACKAGES,
): string {
  const normalized = normalizeServiceInterestCode(code, options)
  return options.find((o) => o.code === normalized)?.name ?? code
}

export function formatServiceInterests(
  codes: string[],
  options: ServicePackageOption[] = DEFAULT_ACTIVE_SERVICE_PACKAGES,
): string {
  return normalizeServiceInterestCodes(codes, options)
    .map((c) => serviceInterestLabel(c, options))
    .join(', ')
}

/** เลือกแพ็กเกจแรกจากความสนใจของ Lead สำหรับเติมใบเสนอราคา */
export function pickPackageIdForQuotation(
  interestCodes: string[],
  packages: { id: string; code: string; is_active: boolean }[],
): string | null {
  const normalized = normalizeServiceInterestCodes(interestCodes)
  const active = packages.filter((p) => p.is_active)
  for (const code of normalized) {
    const pkg = active.find((p) => p.code === code)
    if (pkg) return pkg.id
  }
  return null
}

export function optionsFromPackages(
  packages: { code: string; name: string; is_active: boolean }[],
): ServicePackageOption[] {
  return packages
    .filter((p) => p.is_active)
    .map((p) => ({ code: p.code, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
}
