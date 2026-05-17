import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export interface PublicInquiryInput {
  brand_name: string
  contact_name?: string
  phone?: string
  line_id?: string
  facebook?: string
  business_type?: string
  services_interested?: string[]
  pain_points?: string
  ad_budget_monthly?: number | null
  shop_links?: string
  notes?: string
}

export async function submitPublicInquiry(input: PublicInquiryInput): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise((r) => setTimeout(r, 400))
    return crypto.randomUUID()
  }

  const { data, error } = await supabase.rpc('submit_public_inquiry', {
    p_brand_name: input.brand_name.trim(),
    p_contact_name: input.contact_name?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_line_id: input.line_id?.trim() || null,
    p_facebook: input.facebook?.trim() || null,
    p_business_type: input.business_type || null,
    p_services_interested: input.services_interested ?? [],
    p_pain_points: input.pain_points?.trim() || null,
    p_ad_budget_monthly: input.ad_budget_monthly ?? null,
    p_shop_links: input.shop_links?.trim() || null,
    p_notes: input.notes?.trim() || null,
  })

  if (error) throw new Error(error.message)
  return data as string
}
