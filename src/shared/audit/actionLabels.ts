/** ป้ายภาษาไทยสำหรับ audit action — ใช้ทั้ง Activity และ Admin Audit */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.activate': 'เปิดใช้บัญชี',
  'user.deactivate': 'ปิดบัญชี',
  'user.roles_update': 'อัปเดตบทบาท',
  'user.create': 'สร้างบัญชีพนักงาน',
  'client_access.set': 'ผูกลูกค้า (client)',
  'client_access.clear': 'ยกเลิกผูกลูกค้า',
  'lead.create': 'สร้าง Lead',
  'lead.update': 'แก้ไข Lead',
  'lead.delete': 'ลบ Lead',
  'lead.file_upload': 'แนบไฟล์ Lead',
  'lead.file_delete': 'ลบไฟล์ Lead',
  'quotation.create': 'สร้างใบเสนอราคา',
  'quotation.update': 'แก้ไขใบเสนอราคา',
  'quotation.delete': 'ลบใบเสนอราคา',
  'payment.create': 'บันทึกการชำระเงิน',
  'payment.update': 'แก้ไขการชำระเงิน',
  'payment.confirm': 'ยืนยันชำระเงิน',
  'payment.slip_upload': 'อัปโหลดสลิป',
  'task.create': 'สร้างงาน',
  'task.update': 'แก้ไขงาน',
  'task.delete': 'ลบงาน',
  'onboarding.form_save': 'บันทึกฟอร์มออนบอร์ด',
  'onboarding.checklist_update': 'อัปเดตเช็กลิสต์ออนบอร์ด',
  'content_job.create': 'สร้างงานคอนเทนต์',
  'content_job.update': 'แก้ไขงานคอนเทนต์',
  'content_job.delete': 'ลบงานคอนเทนต์',
  'creator.create': 'สร้างครีเอเตอร์',
  'creator.update': 'แก้ไขครีเอเตอร์',
  'creator.delete': 'ลบครีเอเตอร์',
  'renewal.create': 'สร้างรายการต่อสัญญา',
  'renewal.update': 'อัปเดตต่อสัญญา',
  'customer.contract_extend': 'ขยายสัญญาลูกค้า',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

/** กลุ่มตัวกรองในหน้าบันทึกกิจกรรม */
export const AUDIT_ACTION_GROUPS: { value: string; label: string }[] = [
  { value: '', label: 'ทุกหมวด' },
  { value: 'lead', label: 'Lead / CRM' },
  { value: 'quotation', label: 'ใบเสนอราคา' },
  { value: 'payment', label: 'การเงิน' },
  { value: 'task', label: 'งานภายใน' },
  { value: 'onboarding', label: 'ออนบอร์ด' },
  { value: 'content_job', label: 'คอนเทนต์' },
  { value: 'creator', label: 'ครีเอเตอร์' },
  { value: 'renewal', label: 'ต่อสัญญา' },
  { value: 'user', label: 'ผู้ใช้ / สิทธิ์' },
  { value: 'client_access', label: 'พอร์ทัลลูกค้า' },
]

export function formatAuditMetadata(metadata: Record<string, unknown>): string {
  const keys = Object.keys(metadata)
  if (keys.length === 0) return ''
  const parts: string[] = []
  for (const [k, v] of Object.entries(metadata)) {
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v)) {
      parts.push(`${k}: ${v.join(', ')}`)
    } else if (typeof v === 'object') {
      parts.push(`${k}: ${JSON.stringify(v)}`)
    } else {
      parts.push(`${k}: ${String(v)}`)
    }
  }
  return parts.join(' · ')
}
