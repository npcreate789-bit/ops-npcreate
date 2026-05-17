import type { Lead, LeadStatus } from './types'

/** ลำดับ pipeline หลัก (ก่อนปิดการขาย) */
export const CRM_PIPELINE_STAGES: {
  status: LeadStatus
  label: string
  owner: string
}[] = [
  { status: 'interested', label: 'สนใจ', owner: 'Sales' },
  { status: 'scheduled', label: 'นัดคุย', owner: 'Sales' },
  { status: 'quotation_sent', label: 'ส่งใบเสนอราคา', owner: 'Sales' },
  { status: 'awaiting_payment', label: 'รอชำระ', owner: 'Finance' },
  { status: 'won', label: 'ปิดการขาย', owner: 'Account + ลูกค้า' },
]

export interface LeadNextStep {
  label: string
  path: string
  detail: string
  primary?: boolean
}

export function buildLeadNextSteps(lead: Lead): LeadNextStep[] {
  const steps: LeadNextStep[] = []
  const id = lead.id

  switch (lead.status) {
    case 'interested':
    case 'scheduled':
    case 'follow_up':
      steps.push({
        label: 'สร้างใบเสนอราคา',
        path: `/app/sales/quotations/new?leadId=${id}`,
        detail: 'ขั้นถัดไปของ Sales',
        primary: true,
      })
      steps.push({
        label: 'งานของฉัน — นัดติดตาม',
        path: '/app/work',
        detail: 'Reminder ปรากฏเมื่อถึงเวลา',
      })
      break
    case 'quotation_sent':
      steps.push({
        label: 'จัดการใบเสนอราคา',
        path: '/app/sales',
        detail: 'ติดตามสถานะและส่งลูกค้า',
        primary: true,
      })
      steps.push({
        label: 'แก้ไขใบเสนอราคา',
        path: `/app/sales/quotations/new?leadId=${id}`,
        detail: 'สร้างฉบับใหม่จาก Lead นี้',
      })
      break
    case 'awaiting_payment':
      steps.push({
        label: 'การเงิน — บันทึกชำระ',
        path: '/app/finance',
        detail: 'Admin / Finance ยืนยันสลิป',
        primary: true,
      })
      break
    case 'won':
      if (lead.customer_id) {
        steps.push({
          label: 'รับบรีฟลูกค้า',
          path: `/app/onboarding/${lead.customer_id}`,
          detail: 'Account ตรวจ checklist',
          primary: true,
        })
        steps.push({
          label: 'Client Workspace',
          path: '/app/client',
          detail: 'ลูกค้ากรอกบรีฟ / แชท / ดูรายงาน',
        })
        steps.push({
          label: 'ลูกค้า 360°',
          path: `/app/customers/${lead.customer_id}`,
          detail: 'ภาพรวมในระบบ',
        })
      } else {
        steps.push({
          label: 'ปิดการขายในระบบ',
          path: `/app/sales/quotations/new?leadId=${id}`,
          detail: 'สร้างใบเสนอราคาและบันทึกชำระเพื่อสร้าง Customer',
          primary: true,
        })
      }
      break
    case 'not_interested':
      break
  }

  if (lead.status !== 'won' && lead.status !== 'not_interested') {
    steps.push({
      label: 'งานของฉัน',
      path: '/app/work',
      detail: 'Lead reminder และงานค้างอื่น',
    })
  }

  return steps
}

export function pipelineStageIndex(status: LeadStatus): number {
  const idx = CRM_PIPELINE_STAGES.findIndex((s) => s.status === status)
  return idx >= 0 ? idx : -1
}
