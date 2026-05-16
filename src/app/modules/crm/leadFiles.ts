/** ชื่อไฟล์ใน storage เป็น `{timestamp}_{originalName}` */
export function leadFileDisplayName(storageName: string): string {
  const match = storageName.match(/^\d+_(.+)$/)
  return match ? match[1] : storageName
}

export const LEAD_FILE_MAX_BYTES = 10 * 1024 * 1024

const LEAD_FILE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const LEAD_FILE_EXT = /\.(jpe?g|png|webp|pdf)$/i

export function isLeadFilePdf(pathOrName: string): boolean {
  return /\.pdf$/i.test(pathOrName)
}

export function isLeadFileImage(pathOrName: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(pathOrName)
}

/** คืนข้อความ error ภาษาไทย หรือ null ถ้าผ่าน */
export function validateLeadUploadFile(file: File): string | null {
  if (file.size > LEAD_FILE_MAX_BYTES) {
    return 'ไฟล์ใหญ่เกินไป (สูงสุด 10 MB ต่อไฟล์)'
  }
  if (file.type && LEAD_FILE_MIME_TYPES.has(file.type)) {
    return null
  }
  if (LEAD_FILE_EXT.test(file.name)) {
    return null
  }
  return 'รองรับเฉพาะรูปภาพ (JPEG, PNG, WebP) และ PDF'
}
