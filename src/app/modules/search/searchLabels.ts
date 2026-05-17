import type { SearchResultKind } from './types'

export const SEARCH_KIND_LABELS: Record<SearchResultKind, string> = {
  lead: 'ลูกค้าเป้าหมาย',
  customer: 'ลูกค้า',
  task: 'งาน',
}

export const SEARCH_KIND_ORDER: SearchResultKind[] = ['lead', 'customer', 'task']

export function searchKindLabel(kind: SearchResultKind): string {
  return SEARCH_KIND_LABELS[kind]
}

/** คำแนะนำในช่องค้นหา — ตามประเภทที่บทบาทเข้าถึงได้ */
export function searchInputPlaceholder(kinds: SearchResultKind[]): string {
  if (kinds.length === 0) return 'พิมพ์อย่างน้อย 2 ตัวอักษร...'
  const examples: string[] = []
  if (kinds.includes('lead') || kinds.includes('customer')) examples.push('ชื่อแบรนด์')
  if (kinds.includes('task')) examples.push('ชื่องาน')
  examples.push('ชื่อเมนู')
  return `ค้นหา ${examples.join(', ')}...`
}

/** คำอธิบายเมื่อยังไม่พิมพ์ค้นหา */
export function searchIdleHint(kinds: SearchResultKind[], includeNav: boolean): string {
  const parts = kinds.map((k) => SEARCH_KIND_LABELS[k])
  if (includeNav) parts.push('เมนู')
  if (parts.length === 0) return 'พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา'
  return `ค้นหาได้: ${parts.join(' · ')} — พิมพ์อย่างน้อย 2 ตัวอักษร`
}

/** ข้อความเมื่อไม่พบผลลัพธ์ */
export function searchNoResultsHint(kinds: SearchResultKind[]): string {
  const scope = kinds.map((k) => SEARCH_KIND_LABELS[k]).join(', ')
  return scope
    ? `ไม่พบผลลัพธ์ — ลองชื่อแบรนด์, งาน, หรือชื่อเมนู (${scope})`
    : 'ไม่พบผลลัพธ์ — ลองคำอื่น'
}
