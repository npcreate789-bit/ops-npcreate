export type LeadStatus =
  | 'interested'
  | 'scheduled'
  | 'quotation_sent'
  | 'awaiting_payment'
  | 'won'
  | 'not_interested'
  | 'follow_up'

export type LeadChannel =
  | 'facebook'
  | 'tiktok'
  | 'website'
  | 'line'
  | 'referral'
  | 'other'

/** ช่องทางที่ลูกค้าเลือกให้ทีมติดต่อกลับ (จากฟอร์ม /contact) */
export type PreferredContactChannel = 'line' | 'facebook'

export interface Lead {
  id: string
  owner_id: string
  brand_name: string
  contact_name: string | null
  phone: string | null
  line_id: string | null
  line_user_id: string | null
  /** user id จาก URL แชท OA (chat.line.biz/.../chat/U…) */
  line_oa_chat_user_id: string | null
  facebook: string | null
  facebook_psid: string | null
  business_type: string | null
  ad_budget_daily: number | null
  ad_budget_monthly: number | null
  pain_points: string | null
  /** รหัสแพ็กเกจจากตาราง packages (เช่น gmv_max) — ดู shared/packages/serviceInterests */
  services_interested: string[]
  status: LeadStatus
  channel: LeadChannel
  preferred_contact_channel: PreferredContactChannel | null
  shop_links: string | null
  notes: string | null
  reminder_at: string | null
  customer_id: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

export type LeadInsert = Omit<
  Lead,
  'id' | 'created_at' | 'updated_at' | 'customer_id' | 'converted_at'
> & { id?: string }

export type LeadUpdate = Partial<
  Omit<Lead, 'id' | 'owner_id' | 'created_at' | 'updated_at'>
>

export interface LeadFilters {
  status?: LeadStatus | 'all'
  channel?: LeadChannel | 'all'
  search?: string
  ownerId?: string
}

export interface SalesSummaryRow {
  owner_id: string
  owner_name: string | null
  total: number
  won: number
  active: number
}
