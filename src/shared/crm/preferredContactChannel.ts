import type { Project } from '../../app/modules/projects/types'
import { staffLineChatUrl } from '../line/lineStaffOpenUrl'

export type PreferredContactChannel = 'line' | 'facebook'

export const PREFERRED_CONTACT_CHANNEL_OPTIONS: {
  value: PreferredContactChannel
  label: string
  hint: string
}[] = [
  {
    value: 'line',
    label: 'LINE',
    hint: 'เชื่อมต่อบัญชี LINE แล้วทีม NP Create ทักกลับทาง Official @npcreate',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    hint: 'เชื่อมต่อ Facebook แล้วทีมทักกลับทาง Messenger เพจ NP Create',
  },
]

/** ลิงก์เปิดแชทฝั่งทีม (ตั้งใน Vercel env ได้) */
export const NPCREATE_LINE_OA_URL =
  (import.meta.env.VITE_NPCREATE_LINE_OA_URL as string | undefined)?.trim() ||
  'https://line.me/R/ti/p/@npcreate'

export const NPCREATE_FACEBOOK_MESSENGER_URL =
  (import.meta.env.VITE_NPCREATE_FACEBOOK_URL as string | undefined)?.trim() ||
  'https://m.me/npcreate'

export function preferredContactChannelLabel(
  channel: PreferredContactChannel | null | undefined,
): string {
  if (!channel) return '—'
  return PREFERRED_CONTACT_CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? channel
}

export function openUrlForPreferredChannel(
  channel: PreferredContactChannel,
  lineUserId?: string | null,
): string {
  if (channel === 'line') return staffLineChatUrl(lineUserId)
  return NPCREATE_FACEBOOK_MESSENGER_URL
}

export function staffOpenChannelLabel(channel: PreferredContactChannel): string {
  return channel === 'line' ? 'เปิด LINE' : 'เปิด Messenger'
}

/** ก่อนส่งใบเสนอราคา — ยังคุยนอกระบบ */
export function needsExternalContactBeforeQuotation(lead: {
  status: string
  preferred_contact_channel: PreferredContactChannel | null | undefined
}): boolean {
  if (!lead.preferred_contact_channel) return false
  return ['interested', 'scheduled', 'follow_up'].includes(lead.status)
}

const PROJECT_STARTED_STATUSES = new Set([
  'planning',
  'in_progress',
  'waiting_approval',
  'completed',
  'renewal',
])

/** เปิดแชทใน Client Workspace หลังชำระ/เริ่มงาน */
export function isClientPortalChatEnabled(input: {
  customerStatus: string | null | undefined
  projects: Pick<Project, 'status'>[]
  isStaffPreview?: boolean
}): boolean {
  if (input.isStaffPreview) return true
  if (input.customerStatus === 'active') return true
  return input.projects.some((p) => PROJECT_STARTED_STATUSES.has(p.status))
}

export function clientPortalChatGateMessage(customerStatus: string | null | undefined): string {
  if (customerStatus === 'pending') {
    return 'แชทในระบบจะเปิดหลังยืนยันการชำระและเริ่มโปรเจกต์ — ระหว่างนี้ทีม NP Create จะติดต่อคุณทาง LINE หรือ Facebook ตามที่เลือกไว้'
  }
  return 'แชทในระบบจะเปิดเมื่อโปรเจกต์เริ่มดำเนินการแล้ว — หากมีคำถามด่วน ติดต่อทีม Account ทาง LINE หรือ Facebook'
}
