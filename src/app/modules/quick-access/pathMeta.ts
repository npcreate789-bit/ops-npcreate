import { NAV_ITEMS } from '../../config/navigation'

function normalizePath(pathname: string): string {
  const trimmed =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  return trimmed || '/app'
}

/**
 * แมปชื่อหมวดย่อย — ใช้เมื่อ pathname อยู่ใต้ NAV item แต่ลึกกว่า 1 ชั้น
 * เช่น `/app/sales/quotations/<id>` segment `quotations` → "ใบเสนอราคา"
 */
const SUB_SEGMENT_LABELS: Record<string, string> = {
  quotations: 'ใบเสนอราคา',
  payments: 'การชำระเงิน',
  packages: 'แพ็กเกจ',
  'line-snippets': 'ข้อความ LINE',
  logs: 'บันทึกการใช้งาน',
  new: 'รายการใหม่',
  projects: 'โปรเจกต์',
  brief: 'บรีฟลูกค้า',
  reports: 'รายงาน',
  chat: 'แชท',
  payment: 'การชำระเงิน',
}

/**
 * แมป segment "ลึก" ที่ควรเป็น route จริง (ถ้ายังไม่มี index page ให้คลิกได้ก็จะถูก guard ในตัว breadcrumb)
 * รูปแบบ: key = `${parentPath}/${segment}` → label
 */
const SUB_INDEX_OVERRIDES: Record<string, string> = {
  '/app/sales/quotations': 'ใบเสนอราคา',
  '/app/sales/packages': 'แพ็กเกจ',
  '/app/sales/line-snippets': 'ข้อความ LINE',
  '/app/finance/payments': 'รายการชำระเงิน',
  '/app/admin/logs': 'บันทึกการใช้งาน',
}

function segmentLabel(segment: string): string {
  return SUB_SEGMENT_LABELS[segment] ?? segment
}

function isLikelyId(segment: string): boolean {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true
  if (/^[0-9a-f]{8,}$/i.test(segment)) return true
  if (/^\d+$/.test(segment)) return true
  return false
}

export interface ResolvedMeta {
  path: string
  title: string
  subtitle: string
}

/** ป้ายชื่อชั้น breadcrumb (ระดับเดียว) */
export interface BreadcrumbCrumb {
  path: string
  label: string
  /** false = path นี้ไม่ใช่ route จริง — render เป็น muted (ไม่ใช่ลิงก์) */
  linkable: boolean
}

const NAV_PATHS = new Set(NAV_ITEMS.map((item) => item.path))

/** path นั้น ๆ มี route ใน app ไหม (sub-route ใช้ index override) */
export function isAppRoutePath(path: string): boolean {
  if (path === '/app') return true
  if (NAV_PATHS.has(path)) return true
  if (SUB_INDEX_OVERRIDES[path]) return false
  return false
}

/** แปลง pathname เป็นชื่อแสดงผล (ไทย) */
export function resolvePageMeta(pathname: string): ResolvedMeta {
  const path = normalizePath(pathname)

  const exact = NAV_ITEMS.find((item) => item.path === path)
  if (exact) {
    return { path, title: exact.labelTh, subtitle: exact.label }
  }

  const overrideLabel = SUB_INDEX_OVERRIDES[path]
  if (overrideLabel) {
    return { path, title: overrideLabel, subtitle: 'NP Create OS' }
  }

  const parents = NAV_ITEMS.filter((item) => item.path !== '/app').sort(
    (a, b) => b.path.length - a.path.length,
  )
  const parent = parents.find((item) => path.startsWith(`${item.path}/`))
  if (parent) {
    const tail = path.slice(parent.path.length + 1)
    const tailSegments = tail.split('/').filter(Boolean)
    const lastSegment = tailSegments[tailSegments.length - 1] ?? ''
    const groupSegment = tailSegments.length > 1 ? tailSegments[0] : ''

    if (isLikelyId(lastSegment)) {
      const groupLabel = groupSegment ? segmentLabel(groupSegment) : ''
      const title = groupLabel
        ? `${parent.labelTh} — ${groupLabel}`
        : `${parent.labelTh} — รายละเอียด`
      return { path, title, subtitle: parent.label }
    }

    if (lastSegment === 'new') {
      const groupLabel = groupSegment ? segmentLabel(groupSegment) : ''
      const title = groupLabel
        ? `เพิ่ม${groupLabel}ใหม่`
        : `${parent.labelTh} — สร้างใหม่`
      return { path, title, subtitle: parent.label }
    }

    if (lastSegment) {
      return {
        path,
        title: `${parent.labelTh} — ${segmentLabel(lastSegment)}`,
        subtitle: parent.label,
      }
    }

    return { path, title: `${parent.labelTh} — รายละเอียด`, subtitle: parent.label }
  }

  if (path === '/app') {
    return { path, title: 'หน้าหลัก', subtitle: 'Home' }
  }

  return { path, title: path.replace(/^\/app\/?/, '') || 'หน้าในระบบ', subtitle: 'NP Create OS' }
}

/**
 * สร้าง breadcrumb chain จาก pathname — จะมีถึง 3 ชั้น (parent module / sub-group / current)
 * ชั้นที่ไม่ใช่ route จริง (เช่น `/app/sales/quotations` ไม่มี index page)
 * จะถูก mark `linkable: false` ให้ render เป็น muted
 */
export function resolveBreadcrumbChain(pathname: string): BreadcrumbCrumb[] {
  const path = normalizePath(pathname)
  if (path === '/app') return []

  const crumbs: BreadcrumbCrumb[] = []
  const parents = NAV_ITEMS.filter((item) => item.path !== '/app').sort(
    (a, b) => b.path.length - a.path.length,
  )
  const parent = parents.find((item) => path === item.path || path.startsWith(`${item.path}/`))
  if (!parent) return []

  crumbs.push({ path: parent.path, label: parent.labelTh, linkable: true })
  if (path === parent.path) {
    return crumbs.slice(0, -1)
  }

  const tail = path.slice(parent.path.length + 1)
  const tailSegments = tail.split('/').filter(Boolean)

  if (tailSegments.length === 0) return crumbs.slice(0, -1)

  let acc = parent.path
  for (let i = 0; i < tailSegments.length; i += 1) {
    const segment = tailSegments[i]
    acc = `${acc}/${segment}`
    const isLast = i === tailSegments.length - 1
    if (isLast) continue
    if (isLikelyId(segment)) continue

    const override = SUB_INDEX_OVERRIDES[acc]
    crumbs.push({
      path: acc,
      label: override ?? segmentLabel(segment),
      linkable: Boolean(override),
    })
  }

  return crumbs
}

/** บันทึกได้เฉพาะ route ภายใต้ /app (ไม่รวม login) */
export function isTrackableAppPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return path.startsWith('/app') && path !== '/app/login'
}
