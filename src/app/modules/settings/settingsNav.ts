/** คง query string เมื่อลิงก์จากหน้าตั้งค่า (เช่น ?from=settings) */
export function withSettingsContext(path: string, search?: string | null): string {
  const raw =
    search ??
    (typeof window !== 'undefined' ? window.location.search : '')
  if (!raw || raw === '?') return path
  const query = raw.startsWith('?') ? raw.slice(1) : raw
  if (!query) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}${query}`
}
