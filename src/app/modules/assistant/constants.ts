import type { ClientQuestionKey, StaffPromptKey } from './types'

export const STAFF_PROMPT_OPTIONS: { value: StaffPromptKey; label: string }[] = [
  { value: 'crm_followup', label: 'CRM — ข้อความติดตาม Lead' },
  { value: 'renewal_pitch', label: 'ต่อสัญญา — สคริปต์เสนอต่อ' },
  { value: 'content_brief', label: 'คอนเทนต์ — โครงบรีฟคลิป' },
  { value: 'ads_summary', label: 'แอด — สรุปผลให้ลูกค้า' },
  { value: 'onboarding_checkin', label: 'Onboarding — เช็กลิสต์ติดตาม' },
]

export const CLIENT_QUESTION_OPTIONS: { value: ClientQuestionKey; label: string }[] = [
  { value: 'ads_performance', label: 'ผลแอด 7 วันเป็นอย่างไร?' },
  { value: 'onboarding_status', label: 'ความคืบหน้า Onboarding?' },
  { value: 'delivered_content', label: 'มีคอนเทนต์อะไรส่งแล้วบ้าง?' },
  { value: 'contract_info', label: 'สัญญาและสถานะบริการ?' },
]
