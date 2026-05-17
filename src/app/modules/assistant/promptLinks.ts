import {
  adsUrlForCustomer,
  clientWorkspaceUrl,
  renewalsUrlForCustomer,
} from '../customers/customerLinks'
import type { StaffPromptKey } from './types'

export interface StaffPromptMeta {
  hint: string
  needsCustomer: boolean
}

export const STAFF_PROMPT_META: Record<StaffPromptKey, StaffPromptMeta> = {
  crm_followup: {
    hint: 'ข้อความติดตาม Lead — ไม่ต้องเลือกลูกค้า',
    needsCustomer: false,
  },
  renewal_pitch: {
    hint: 'สคริปต์เสนอต่อสัญญา — ต้องเลือกลูกค้า',
    needsCustomer: true,
  },
  content_brief: {
    hint: 'โครงบรีฟคลิป — เลือกลูกค้าเพื่อดึงความคืบหน้า Onboarding',
    needsCustomer: false,
  },
  ads_summary: {
    hint: 'สรุปแอด 7 วัน — ต้องเลือกลูกค้าเพื่อดึงตัวเลขจริง',
    needsCustomer: true,
  },
  onboarding_checkin: {
    hint: 'เช็กลิสต์ติดตาม — ต้องเลือกลูกค้า',
    needsCustomer: true,
  },
}

export function staffPromptNeedsCustomer(key: StaffPromptKey): boolean {
  return STAFF_PROMPT_META[key].needsCustomer
}

export interface AssistantRelatedLink {
  to: string
  label: string
}

/** ลิงก์ไปโมดูลที่เกี่ยวข้องกับเทมเพลตและลูกค้าที่เลือก */
export function staffPromptRelatedLinks(
  promptKey: StaffPromptKey,
  customerId?: string,
): AssistantRelatedLink[] {
  const links: AssistantRelatedLink[] = [
    { to: '/app/crm', label: 'CRM' },
    { to: '/app/dashboard', label: 'แดชบอร์ด' },
  ]

  if (!customerId) {
    switch (promptKey) {
      case 'crm_followup':
        return [{ to: '/app/crm', label: 'CRM' }, { to: '/app/sales', label: 'ขาย' }]
      case 'content_brief':
        return [
          { to: '/app/content', label: 'งานคอนเทนต์' },
          { to: '/app/creators', label: 'ครีเอเตอร์' },
        ]
      default:
        return links
    }
  }

  links.unshift({
    to: `/app/customers/${customerId}`,
    label: 'ลูกค้า 360°',
  })

  switch (promptKey) {
    case 'renewal_pitch':
      links.push(
        { to: renewalsUrlForCustomer(customerId), label: 'ต่อสัญญา' },
        { to: clientWorkspaceUrl(customerId, 'payment'), label: 'พื้นที่ลูกค้า · ชำระ' },
      )
      break
    case 'content_brief':
      links.push(
        { to: '/app/content', label: 'งานคอนเทนต์' },
        { to: `/app/onboarding/${customerId}`, label: 'รับบรีฟ' },
      )
      break
    case 'ads_summary':
      links.push(
        { to: adsUrlForCustomer(customerId), label: 'งานยิงแอด' },
        { to: clientWorkspaceUrl(customerId, 'reports'), label: 'รายงานลูกค้า' },
      )
      break
    case 'onboarding_checkin':
      links.push(
        { to: `/app/onboarding/${customerId}`, label: 'รับบรีฟ' },
        { to: clientWorkspaceUrl(customerId, 'brief'), label: 'พื้นที่ลูกค้า · บรีฟ' },
      )
      break
    case 'crm_followup':
      links.push({ to: '/app/sales', label: 'ขาย' })
      break
    default:
      break
  }

  return links
}
