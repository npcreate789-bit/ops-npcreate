/** แพ็กเกจบริการ — รหัส (code) เป็นแหล่งความจริงเดียวใน contact / CRM / ใบเสนอราคา */

export interface ServicePackageOption {
  code: string
  name: string
}

/** ป้ายภาษาไทยตามรหัส — ใช้ใน /contact และข้อความ LINE (ไม่พึ่งชื่อจาก DB ที่อาจเป็นภาษาอังกฤษ) */
export const SERVICE_PACKAGE_TH_LABELS: Record<string, string> = {
  gmv_max: 'ดูแล GMV Max',
  gmv_course: 'คอร์ส GMV Max',
  tiktok_one: 'TikTok One / ครีเอเตอร์',
  content: 'ผลิตคอนเทนต์',
  live: 'ไลฟ์คอมเมิร์ซ',
  consulting: 'ที่ปรึกษาแบบส่วนตัว',
  software: 'ซอฟต์แวร์ / ลิขสิทธิ์',
  other: 'บริการอื่น ๆ',
}

/** ตรงกับ supabase/migrations/00065_seed_sales_packages.sql — fallback เมื่อโหลดจาก DB ไม่ได้ */
export const DEFAULT_ACTIVE_SERVICE_PACKAGES: ServicePackageOption[] = [
  { code: 'gmv_max', name: SERVICE_PACKAGE_TH_LABELS.gmv_max },
  { code: 'gmv_course', name: SERVICE_PACKAGE_TH_LABELS.gmv_course },
  { code: 'tiktok_one', name: SERVICE_PACKAGE_TH_LABELS.tiktok_one },
  { code: 'content', name: SERVICE_PACKAGE_TH_LABELS.content },
  { code: 'live', name: SERVICE_PACKAGE_TH_LABELS.live },
  { code: 'consulting', name: SERVICE_PACKAGE_TH_LABELS.consulting },
  { code: 'software', name: SERVICE_PACKAGE_TH_LABELS.software },
  { code: 'other', name: SERVICE_PACKAGE_TH_LABELS.other },
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
  const thai = SERVICE_PACKAGE_TH_LABELS[normalized]
  if (thai) return thai
  return options.find((o) => o.code === normalized)?.name ?? normalized
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
