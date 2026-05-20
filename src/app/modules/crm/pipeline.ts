import type { LeadStatus } from './types'

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

export function pipelineStageIndex(status: LeadStatus): number {
  const idx = CRM_PIPELINE_STAGES.findIndex((s) => s.status === status)
  return idx >= 0 ? idx : -1
}
