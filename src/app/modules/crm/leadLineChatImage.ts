/** อัปโหลดรูปสำหรับแชท LINE — ใช้ MIME ที่ bucket `leads` รองรับเท่านั้น */

export const LINE_CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024

const LINE_CHAT_IMAGE_EXT = /\.(jpe?g|png|webp)$/i

/** คืนข้อความ error ภาษาไทย หรือ null ถ้าผ่าน */
export function validateLineChatImage(file: File): string | null {
  if (file.size > LINE_CHAT_IMAGE_MAX_BYTES) {
    return 'รูปใหญ่เกินไป (สูงสุด 10 MB)'
  }
  if (inferLineChatImageContentType(file)) return null
  return 'รองรับเฉพาะรูป JPEG, PNG หรือ WebP'
}

/** MIME ที่ storage bucket `leads` อนุญาตสำหรับรูปแชท LINE */
export function inferLineChatImageContentType(file: File): string | null {
  const type = file.type?.toLowerCase().trim() ?? ''
  if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/pjpeg') {
    return 'image/jpeg'
  }
  if (type === 'image/png' || type === 'image/x-png') return 'image/png'
  if (type === 'image/webp') return 'image/webp'

  const name = file.name.toLowerCase()
  if (/\.jpe?g$/.test(name)) return 'image/jpeg'
  if (/\.png$/.test(name)) return 'image/png'
  if (/\.webp$/.test(name)) return 'image/webp'

  if (type.startsWith('image/') && LINE_CHAT_IMAGE_EXT.test(name)) {
    return 'image/jpeg'
  }

  return null
}

export function lineChatImageStorageError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('payload too large') || lower.includes('exceeded')) {
    return 'รูปใหญ่เกินไป (สูงสุด 10 MB)'
  }
  if (lower.includes('mime') || lower.includes('invalid')) {
    return 'รูปนี้ส่งไม่ได้ — ใช้ไฟล์ JPEG, PNG หรือ WebP'
  }
  return message || 'อัปโหลดรูปไม่สำเร็จ'
}

export function sanitizeLineChatFileName(name: string): string {
  return name.replace(/[^\w.\-ก-๙() ]+/gu, '_').slice(0, 120) || 'image.jpg'
}
