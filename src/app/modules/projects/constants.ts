import type { ProjectServiceType, ProjectStatus } from './types'

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'waiting_brief', label: 'รอบรีฟ' },
  { value: 'planning', label: 'วางแผน' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'waiting_approval', label: 'รออนุมัติ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'renewal', label: 'ต่อสัญญา' },
  { value: 'closed', label: 'ปิดโปรเจกต์' },
]

export const PROJECT_SERVICE_OPTIONS: { value: ProjectServiceType; label: string }[] = [
  { value: 'GMV_MAX', label: 'GMV Max Management' },
  { value: 'CONTENT', label: 'Content Production' },
  { value: 'TIKTOK_ONE', label: 'TikTok One / Creator' },
  { value: 'LIVE', label: 'Live Commerce' },
  { value: 'CONSULTING', label: 'Private Consulting' },
  { value: 'COURSE', label: 'Course Online' },
  { value: 'SOFTWARE', label: 'Software / License' },
  { value: 'OTHER', label: 'อื่น ๆ' },
]

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function projectServiceLabel(type: ProjectServiceType): string {
  return PROJECT_SERVICE_OPTIONS.find((o) => o.value === type)?.label ?? type
}
