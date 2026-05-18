import { adminClientWizardPath } from '../../../shared/line/staffLineMessaging'
import type { OnboardingCustomer, OnboardingDetail } from './types'

export type OnboardingStage = 'awaiting_brief' | 'in_review' | 'ready'

export const ONBOARDING_PIPELINE_STAGES: {
  stage: OnboardingStage
  label: string
  hint: string
}[] = [
  { stage: 'awaiting_brief', label: 'รอลูกค้าส่งบรีฟ', hint: 'ลูกค้ากรอกใน Client Workspace' },
  { stage: 'in_review', label: 'ตรวจ checklist', hint: 'Account ตรวจความครบ' },
  { stage: 'ready', label: 'พร้อมยิงแอด', hint: 'เปิดงาน Ads' },
]

export type OnboardingFilter = OnboardingStage | 'all'

export interface OnboardingNextStep {
  label: string
  path: string
  detail: string
  primary?: boolean
}

export function customerStatusLabelTh(status: string): string {
  switch (status) {
    case 'pending':
      return 'รอเปิดใช้งาน'
    case 'active':
      return 'ใช้งานอยู่'
    case 'paused':
      return 'พักชั่วคราว'
    case 'churned':
      return 'สิ้นสุดสัญญา'
    default:
      return status
  }
}

export function getOnboardingStage(row: Pick<OnboardingCustomer, 'has_form' | 'ready_for_ads'>): OnboardingStage {
  if (row.ready_for_ads) return 'ready'
  if (!row.has_form) return 'awaiting_brief'
  return 'in_review'
}

function needsPortalAccount(customer: Pick<OnboardingCustomer, 'status' | 'has_portal'>): boolean {
  return customer.status === 'pending' || !customer.has_portal
}

export function buildOnboardingNextSteps(
  detail: OnboardingDetail,
  opts?: { clientSubmitted?: boolean },
): OnboardingNextStep[] {
  const { customer } = detail
  const id = customer.id
  const stage = getOnboardingStage(customer)
  const steps: OnboardingNextStep[] = []

  if (needsPortalAccount(customer)) {
    steps.push({
      label: 'สร้างบัญชีลูกค้า (พอร์ทัล)',
      path: adminClientWizardPath(id),
      detail:
        customer.status === 'pending'
          ? 'สถานะรอเปิดใช้งาน — เปิดบัญชี Client Workspace แล้วส่งข้อมูลทาง LINE'
          : 'ยังไม่มีบัญชีพอร์ทัล — Admin สร้างและส่งรหัสเข้าใช้',
      primary: true,
    })
  }

  switch (stage) {
    case 'awaiting_brief':
      steps.push({
        label: 'แจ้งลูกค้ากรอกบรีฟ',
        path: `/app/client/brief?preview=${id}`,
        detail: 'ลูกค้าใช้เมนูบรีฟงานในพื้นที่ลูกค้า',
        primary: true,
      })
      steps.push({
        label: 'ลูกค้า 360°',
        path: `/app/customers/${id}`,
        detail: 'ดูสัญญาและข้อมูลติดต่อ',
      })
      break
    case 'in_review':
      if (opts?.clientSubmitted) {
        steps.push({
          label: 'ลูกค้าส่งบรีฟแล้ว',
          path: '#checklist',
          detail: 'ตรวจ checklist ด้านล่างให้ครบทุกข้อ',
          primary: true,
        })
      } else {
        steps.push({
          label: 'ตรวจ checklist',
          path: '#checklist',
          detail: 'ทำเครื่องหมายรายการที่ได้รับจากลูกค้าแล้ว',
          primary: true,
        })
      }
      steps.push({
        label: 'แก้ไขข้อมูลบรีฟ',
        path: '#brief',
        detail: 'เติมข้อมูลที่ลูกค้าส่งมา (ถ้ายังไม่ครบ)',
      })
      steps.push({
        label: 'มอบหมายทีม',
        path: '#owners',
        detail: 'Account + ทีมยิงแอด',
      })
      break
    case 'ready':
      steps.push({
        label: 'สร้างโปรเจกต์',
        path: `/app/projects/new?customerId=${id}`,
        detail: 'เปิดงานตามบริการที่ขาย',
        primary: true,
      })
      steps.push({
        label: 'งานยิงแอด',
        path: `/app/ads/${id}`,
        detail: 'บันทึกผลรายวัน',
      })
      steps.push({
        label: 'พื้นที่ลูกค้า',
        path: `/app/client?preview=${id}`,
        detail: 'ลูกค้าดูรายงานและแชท',
      })
      break
  }

  steps.push({
    label: 'งานของฉัน',
    path: '/app/work',
    detail: 'แชท/บรีฟค้างจากลูกค้า',
  })

  return steps
}
