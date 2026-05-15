import type { CreatorStatus } from './types'

export const CREATOR_STATUS_OPTIONS: { value: CreatorStatus; label: string }[] = [
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'พัก' },
  { value: 'blacklist', label: 'แบล็กลิสต์' },
]

export function creatorStatusLabel(status: CreatorStatus): string {
  return CREATOR_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}
