import { NAV_ITEMS } from '../../config/navigation'
import type { QuickAccessEntry } from './types'

function normalizePath(pathname: string): string {
  const trimmed =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname
  return trimmed || '/app'
}

/** แปลง pathname เป็นชื่อแสดงผล (ไทย) */
export function resolvePageMeta(
  pathname: string,
): Pick<QuickAccessEntry, 'path' | 'title' | 'subtitle'> {
  const path = normalizePath(pathname)

  const exact = NAV_ITEMS.find((item) => item.path === path)
  if (exact) {
    return { path, title: exact.labelTh, subtitle: exact.label }
  }

  const parents = NAV_ITEMS.filter((item) => item.path !== '/app').sort(
    (a, b) => b.path.length - a.path.length,
  )
  const parent = parents.find((item) => path.startsWith(`${item.path}/`))
  if (parent) {
    return {
      path,
      title: `${parent.labelTh} — รายละเอียด`,
      subtitle: parent.label,
    }
  }

  if (path === '/app') {
    return { path, title: 'หน้าหลัก', subtitle: 'Home' }
  }

  return { path, title: path.replace(/^\/app\/?/, '') || 'หน้าในระบบ', subtitle: 'NP Create OS' }
}

/** บันทึกได้เฉพาะ route ภายใต้ /app (ไม่รวม login) */
export function isTrackableAppPath(pathname: string): boolean {
  const path = normalizePath(pathname)
  return path.startsWith('/app') && path !== '/app/login'
}
