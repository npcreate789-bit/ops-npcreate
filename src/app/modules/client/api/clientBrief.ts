import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { OnboardingForm, OnboardingFormInput } from '../../onboarding/types'
import { markClientBriefSubmitted, saveOnboardingForm } from '../../onboarding/api/onboarding'

export async function saveClientBrief(
  customerId: string,
  input: OnboardingFormInput,
  submit: boolean,
): Promise<OnboardingForm> {
  if (!isSupabaseConfigured || !supabase) {
    const form = await saveOnboardingForm(customerId, input)
    if (submit) await markClientBriefSubmitted(customerId)
    const submittedAt = submit ? new Date().toISOString() : form.client_submitted_at
    return { ...form, client_submitted_at: submittedAt }
  }

  const { data, error } = await supabase.rpc('save_client_onboarding_form', {
    p_tiktok_shop_url: input.tiktok_shop_url ?? null,
    p_product_links: input.product_links ?? null,
    p_pricing_info: input.pricing_info ?? null,
    p_promotion_info: input.promotion_info ?? null,
    p_profit_margin: input.profit_margin ?? null,
    p_commission_info: input.commission_info ?? null,
    p_target_roi: input.target_roi ?? null,
    p_daily_ad_budget: input.daily_ad_budget ?? null,
    p_existing_content: input.existing_content ?? null,
    p_ads_account_info: input.ads_account_info ?? null,
    p_seller_account_info: input.seller_account_info ?? null,
    p_business_center_info: input.business_center_info ?? null,
    p_notes: input.notes ?? null,
    p_submit: submit,
  })

  if (error) throw new Error(error.message)

  const formId = data as string
  const { data: form, error: fetchErr } = await supabase
    .from('onboarding_forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (fetchErr) throw new Error(fetchErr.message)
  return form as OnboardingForm
}
