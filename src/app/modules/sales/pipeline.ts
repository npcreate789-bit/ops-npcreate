import type { Quotation, QuotationStatus } from './types'
import { isQuotationSentLike } from './constants'

export interface SalesNextStep {
  label: string
  path: string
  detail: string
  primary?: boolean
}

export function buildQuotationNextSteps(q: Quotation): SalesNextStep[] {
  const steps: SalesNextStep[] = []

  if (q.lead_id) {
    steps.push({
      label: 'Lead ใน CRM',
      path: `/app/crm/${q.lead_id}`,
      detail: 'ประวัติการติดตามก่อนขาย',
    })
  }

  switch (q.status) {
    case 'draft':
      steps.push({
        label: 'ส่งให้ลูกค้า',
        path: `/app/sales/quotations/${q.id}`,
        detail: 'สร้างลิงก์สาธารณะด้านล่าง แล้วตั้งสถานะ "ส่งแล้ว"',
        primary: true,
      })
      break
    case 'sent':
    case 'viewed':
    case 'accepted':
      steps.push({
        label: 'ติดตามลูกค้า',
        path: `/app/sales/quotations/${q.id}`,
        detail: 'อัปเดตสถานะเมื่อลูกค้าตอบรับ',
      })
      if (q.status === 'accepted') {
        steps.push({
          label: 'ตั้งรอชำระเงิน',
          path: `/app/sales/quotations/${q.id}`,
          detail: 'Sales — ก่อนส่ง Finance',
          primary: true,
        })
      }
      break
    case 'awaiting_payment':
      steps.push({
        label: 'บันทึกชำระเงิน',
        path: q.customer_id
          ? `/app/finance/payments/new?customerId=${q.customer_id}&quotationId=${q.id}`
          : '/app/finance',
        detail: 'Finance / Admin ยืนยันสลิป',
        primary: true,
      })
      break
    case 'paid':
      if (q.customer_id) {
        steps.push({
          label: 'รับบรีฟลูกค้า',
          path: `/app/onboarding/${q.customer_id}`,
          detail: 'Account ตรวจ checklist',
          primary: true,
        })
        steps.push({
          label: 'Client Workspace',
          path: '/app/client',
          detail: 'ลูกค้าเข้าใช้บรีฟ · แชท · รายงาน',
        })
        steps.push({
          label: 'ลูกค้า 360°',
          path: `/app/customers/${q.customer_id}`,
          detail: 'ภาพรวมหลังปิดการขาย',
        })
      } else if (q.lead_id) {
        steps.push({
          label: 'สร้าง Customer',
          path: `/app/sales/quotations/${q.id}`,
          detail: 'ตรวจว่าสถานะชำระแล้วและมี lead_id',
          primary: true,
        })
      }
      break
    case 'cancelled':
      break
  }

  if (q.status !== 'cancelled' && q.status !== 'paid') {
    steps.push({
      label: 'งานของฉัน',
      path: '/app/work',
      detail: 'Lead reminder และงานอื่น',
    })
  }

  if (isQuotationSentLike(q.status) && q.status !== 'paid' && q.lead_id) {
    steps.push({
      label: 'อัปเดต Lead เป็นรอชำระ',
      path: `/app/crm/${q.lead_id}`,
      detail: 'ตั้งสถานะ Lead ให้สอดคล้อง',
    })
  }

  return steps
}

export function salesPipelineIndex(status: QuotationStatus): number {
  const order: QuotationStatus[] = [
    'draft',
    'sent',
    'viewed',
    'accepted',
    'awaiting_payment',
    'paid',
  ]
  return order.indexOf(status)
}
