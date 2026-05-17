/** แปลงข้อความ error จาก API ให้ผู้ใช้เข้าใจ */
export function friendlyContactSubmitError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('submit_public_inquiry') || m.includes('could not find the function')) {
    return 'ระบบยังไม่พร้อมรับแบบฟอร์มออนไลน์ชั่วคราว กรุณาติดต่อทีม NP Create ทาง LINE หรือโทรศัพท์'
  }
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
  }
  if (m.includes('leads_owner_id_fkey') || m.includes('no lead owner')) {
    return 'ระบบยังไม่ได้ตั้งผู้รับ Lead — กรุณาติดต่อทีม NP Create ทาง LINE หรือโทรศัพท์'
  }
  return message
}

export function validateContactForm(brandName: string): string | null {
  if (!brandName.trim()) return 'กรุณาระบุชื่อแบรนด์'
  if (brandName.trim().length < 2) return 'ชื่อแบรนด์สั้นเกินไป'
  return null
}
