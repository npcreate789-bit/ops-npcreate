import { bangkokTodayIsoDate } from '../../../shared/dates/bangkok'
import { adminClientWizardPath } from '../../../shared/line/staffLineMessaging'
import type { Payment, PaymentStatus } from './types'

export const FINANCE_PIPELINE_STAGES: { status: PaymentStatus; label: string; owner: string }[] =
  [
    { status: 'pending', label: 'รอชำระ', owner: 'ลูกค้า / Finance' },
    { status: 'paid', label: 'ชำระแล้ว', owner: 'Account รับบรีฟ' },
  ]

export interface FinanceNextStep {
  label: string
  path: string
  detail: string
  primary?: boolean
}

export function isPaymentOverdue(payment: Payment, today = bangkokTodayIsoDate()): boolean {
  if (payment.status === 'overdue') return true
  if (payment.status !== 'pending' || !payment.due_date) return false
  return payment.due_date.slice(0, 10) < today
}

export function buildPaymentNextSteps(payment: Payment): FinanceNextStep[] {
  const steps: FinanceNextStep[] = []
  const id = payment.id

  if (payment.quotation_id) {
    steps.push({
      label: 'ใบเสนอราคาที่เชื่อม',
      path: `/app/sales/quotations/${payment.quotation_id}`,
      detail: 'Sales',
    })
  }

  switch (payment.status) {
    case 'pending':
    case 'overdue':
      steps.push({
        label: 'ยืนยันชำระเงิน',
        path: `/app/finance/payments/${id}`,
        detail: 'อัปโหลดสลิปแล้วกดยืนยัน — เปิดใช้งานลูกค้า',
        primary: true,
      })
      steps.push({
        label: 'ติดตามลูกค้า',
        path: `/app/customers/${payment.customer_id}`,
        detail: 'ลูกค้าแจ้งสลิปผ่าน Client Workspace / แชท',
      })
      break
    case 'paid':
      steps.push({
        label: 'สร้างบัญชีลูกค้า (พอร์ทัล)',
        path: adminClientWizardPath(payment.customer_id),
        detail: 'หลังยืนยันชำระ — เปิดบัญชีและส่งรหัสทาง LINE',
        primary: true,
      })
      steps.push({
        label: 'รับบรีฟลูกค้า',
        path: `/app/onboarding/${payment.customer_id}`,
        detail: 'Account ตรวจ checklist',
      })
      steps.push({
        label: 'Client Workspace',
        path: '/app/client',
        detail: 'ลูกค้าเห็นสถานะชำระและเอกสาร',
      })
      steps.push({
        label: 'ลูกค้า 360°',
        path: `/app/customers/${payment.customer_id}`,
        detail: 'ภาพรวมหลังเปิดใช้งาน',
      })
      steps.push({
        label: 'สร้างโปรเจกต์ (ถ้าพร้อม)',
        path: `/app/projects/new?customerId=${payment.customer_id}`,
        detail: 'หลังรับบรีฟ — แยกงานตามบริการ',
      })
      break
    case 'cancelled':
      break
  }

  if (payment.status !== 'cancelled') {
    steps.push({
      label: 'งานของฉัน',
      path: '/app/work',
      detail: 'รายการครบกำหนดชำระและแจ้งเตือน',
    })
  }

  return steps
}
