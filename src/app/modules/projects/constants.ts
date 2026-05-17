import type { ProjectServiceType, ProjectStatus } from './types'

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'onboarding', label: 'เริ่มต้น' },
  { value: 'waiting_brief', label: 'รอบรีฟ' },
  { value: 'planning', label: 'วางแผน' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'waiting_approval', label: 'รออนุมัติลูกค้า' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'renewal', label: 'ต่อสัญญา' },
  { value: 'closed', label: 'ปิดโปรเจกต์' },
]

export const PROJECT_SERVICE_OPTIONS: { value: ProjectServiceType; label: string }[] = [
  { value: 'GMV_MAX', label: 'ดูแล GMV Max' },
  { value: 'CONTENT', label: 'ผลิตคอนเทนต์' },
  { value: 'TIKTOK_ONE', label: 'TikTok One / Creator' },
  { value: 'LIVE', label: 'Live Commerce' },
  { value: 'CONSULTING', label: 'ที่ปรึกษา' },
  { value: 'COURSE', label: 'คอร์สออนไลน์' },
  { value: 'SOFTWARE', label: 'Software / License' },
  { value: 'OTHER', label: 'อื่น ๆ' },
]

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function projectServiceLabel(type: ProjectServiceType): string {
  return PROJECT_SERVICE_OPTIONS.find((o) => o.value === type)?.label ?? type
}
