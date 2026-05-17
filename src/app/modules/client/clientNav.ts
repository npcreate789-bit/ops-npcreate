/** ลิงก์ภายในพื้นที่ลูกค้า — คง ?preview= สำหรับทีมงาน */
export function withClientPreview(path: string, previewCustomerId?: string | null): string {
  if (!previewCustomerId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}preview=${encodeURIComponent(previewCustomerId)}`
}
