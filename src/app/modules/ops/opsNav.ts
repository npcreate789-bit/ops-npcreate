/** คง query string ปัจจุบันเมื่อลิงก์ไปโมดูลอื่น (เช่น ?from=ops) */
export function withOpsContext(path: string, search?: string | null): string {
  const raw =
    search ??
    (typeof window !== 'undefined' ? window.location.search : '')
  if (!raw || raw === '?') return path
  const query = raw.startsWith('?') ? raw.slice(1) : raw
  if (!query) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}${query}`
}
