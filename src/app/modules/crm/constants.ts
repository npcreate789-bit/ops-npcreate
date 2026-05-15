import type { LeadChannel, LeadStatus } from './types'

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'interested', label: 'สนใจ' },
  { value: 'scheduled', label: 'นัดคุย' },
  { value: 'quotation_sent', label: 'ส่งใบเสนอราคา' },
  { value: 'awaiting_payment', label: 'รอชำระเงิน' },
  { value: 'won', label: 'ปิดการขายแล้ว' },
  { value: 'not_interested', label: 'ไม่สนใจ' },
  { value: 'follow_up', label: 'ติดตามใหม่' },
]

export const LEAD_CHANNEL_OPTIONS: { value: LeadChannel; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'website', label: 'Website' },
  { value: 'line', label: 'Line' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'อื่น ๆ' },
]

export const BUSINESS_TYPES = [
  'สกินแคร์',
  'อาหาร',
  'แฟชั่น',
  'สุขภาพ',
  'ของใช้ในบ้าน',
  'บริการ',
  'อื่น ๆ',
]

export const SERVICE_PACKAGES = [
  'GMV Max',
  'คอร์ส GMV Max',
  'TikTok One / Creator',
  'ผลิตคอนเทนต์',
  'Live Commerce',
  'Private Consulting',
  'Software / License',
  'บริการอื่น ๆ',
]

export const ACTIVE_STATUSES: LeadStatus[] = [
  'interested',
  'scheduled',
  'quotation_sent',
  'awaiting_payment',
  'follow_up',
]

export function statusLabel(status: LeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function channelLabel(channel: LeadChannel): string {
  return LEAD_CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? channel
}
