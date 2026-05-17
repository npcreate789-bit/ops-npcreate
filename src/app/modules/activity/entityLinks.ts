import type { AuditLogRow } from '../admin/api/auditLogs'

/** ป้ายประเภทข้อมูล — อ่านง่ายกว่า entity_type ดิบ */
export const ACTIVITY_ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  quotation: 'ใบเสนอราคา',
  payment: 'การชำระเงิน',
  task: 'งานภายใน',
  customer: 'ลูกค้า',
  content_job: 'งานคอนเทนต์',
  creator: 'ครีเอเตอร์',
  contract_renewal: 'ต่อสัญญา',
  project: 'โปรเจกต์',
  profile: 'ผู้ใช้',
}

export function activityEntityLabel(entityType: string): string {
  return ACTIVITY_ENTITY_LABELS[entityType] ?? entityType
}

export function activityCustomerId(row: AuditLogRow): string | null {
  const fromMeta = row.metadata?.customer_id
  if (typeof fromMeta === 'string' && fromMeta) return fromMeta
  if (row.entity_type === 'customer' && row.entity_id) return row.entity_id
  return null
}

/** ลิงก์ไปหน้าแก้ไข/ดูข้อมูลที่เกี่ยวข้อง — null ถ้าเปิดไม่ได้ */
export function activityEntityHref(row: AuditLogRow): string | null {
  const id = row.entity_id

  if (row.entity_type === 'profile') {
    return '/app/admin'
  }

  if (!id) return null

  switch (row.entity_type) {
    case 'lead':
      return `/app/crm/${id}`
    case 'quotation':
      return `/app/sales/quotations/${id}`
    case 'payment':
      return `/app/finance/payments/${id}`
    case 'task':
      return `/app/tasks/${id}`
    case 'customer':
      if (row.action.startsWith('onboarding.')) return `/app/onboarding/${id}`
      return `/app/customers/${id}`
    case 'content_job':
      return `/app/content/${id}`
    case 'creator':
      return `/app/creators/${id}`
    case 'project':
      return `/app/projects/${id}`
    case 'contract_renewal':
      return '/app/renewals'
    default:
      return null
  }
}
