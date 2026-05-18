import type { PreferredContactChannel } from '../../../../shared/crm/preferredContactChannel'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { mockLeadsApi } from '../../crm/api/mockStore'

export interface PublicInquiryInput {
  brand_name: string
  preferred_contact_channel: PreferredContactChannel
  contact_name?: string
  phone?: string
  line_id?: string
  line_user_id?: string
  facebook?: string
  facebook_psid?: string
  business_type?: string
  services_interested?: string[]
  ad_budget_monthly?: number | null
  /** honeypot — ต้องว่างเสมอ */
  company_website?: string
}

const DEV_OWNER = '00000000-0000-4000-8000-000000000001'

async function submitPublicInquiryDevMock(input: PublicInquiryInput): Promise<string> {
  await new Promise((r) => setTimeout(r, 400))

  const lead = await mockLeadsApi.create({
    owner_id: DEV_OWNER,
    brand_name: input.brand_name.trim(),
    contact_name: input.contact_name?.trim() || null,
    phone: input.phone?.trim() || null,
    line_id: input.line_id?.trim() || null,
    line_user_id: input.line_user_id?.trim() || null,
    facebook: input.facebook?.trim() || null,
    facebook_psid: input.facebook_psid?.trim() || null,
    business_type: input.business_type || null,
    ad_budget_daily: null,
    ad_budget_monthly: input.ad_budget_monthly ?? null,
    reminder_at: null,
    pain_points: null,
    services_interested: input.services_interested ?? [],
    status: 'interested',
    channel: 'website',
    preferred_contact_channel: input.preferred_contact_channel,
    shop_links: null,
    notes: null,
  })

  return lead.id
}

export async function submitPublicInquiry(input: PublicInquiryInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return submitPublicInquiryDevMock(input)
  }

  const { data, error } = await supabase.rpc('submit_public_inquiry', {
    p_brand_name: input.brand_name.trim(),
    p_contact_name: input.contact_name?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_line_id: input.line_id?.trim() || null,
    p_facebook: input.facebook?.trim() || null,
    p_business_type: input.business_type || null,
    p_services_interested: input.services_interested ?? [],
    p_pain_points: null,
    p_ad_budget_monthly: input.ad_budget_monthly ?? null,
    p_shop_links: null,
    p_notes: null,
    p_company_website: input.company_website?.trim() || null,
    p_preferred_contact_channel: input.preferred_contact_channel,
    p_line_user_id: input.line_user_id?.trim() || null,
    p_facebook_psid: input.facebook_psid?.trim() || null,
  })

  if (error) throw new Error(error.message)
  return data as string
}
