import type { Lead } from './types'

/** ชื่อที่แสดงใน UI — ใช้ผู้ติดต่อเป็นหลัก รองรับข้อมูลเก่าที่มีแค่ brand_name */
export function leadDisplayName(lead: Pick<Lead, 'contact_name' | 'brand_name'>): string {
  const contact = lead.contact_name?.trim()
  if (contact) return contact
  return lead.brand_name?.trim() || '—'
}
