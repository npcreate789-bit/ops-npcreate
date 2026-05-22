import { clearCompanyPaymentSettingsCache, fetchCompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import type { CompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export async function loadCompanyPaymentSettingsForEdit(): Promise<CompanyPaymentSettings> {
  return fetchCompanyPaymentSettings(true)
}

export async function saveCompanyPaymentSettings(
  input: CompanyPaymentSettings,
): Promise<CompanyPaymentSettings> {
  if (!isSupabaseConfigured || !supabase) {
    clearCompanyPaymentSettingsCache()
    return fetchCompanyPaymentSettings(true)
  }

  const { data, error } = await supabase.rpc('update_company_payment_settings', {
    p_bank_name: input.bank_name,
    p_account_number: input.account_number,
    p_account_name: input.account_name,
    p_promptpay_id: input.promptpay_id,
    p_sla_hours: input.payment_instructions_sla_hours,
    p_verification_seconds: input.payment_verification_seconds,
    p_auto_confirm_enabled: input.auto_confirm_enabled,
    p_auto_confirm_max_amount: input.auto_confirm_max_amount,
    p_amount_tolerance_baht: input.amount_tolerance_baht,
    p_require_reference_match: input.require_reference_match,
    p_manual_review_min_amount: input.manual_review_min_amount,
    p_line_notify_slip_received: input.line_notify_slip_received,
    p_line_notify_payment_confirmed: input.line_notify_payment_confirmed,
    p_line_notify_slip_rejected: input.line_notify_slip_rejected,
    p_line_notify_review_pending: input.line_notify_review_pending,
    p_line_notify_customer_handoff: input.line_notify_customer_handoff,
    p_bank_match_auto_confirm_enabled: input.bank_match_auto_confirm_enabled,
    p_bank_match_amount_tolerance_baht: input.bank_match_amount_tolerance_baht,
    p_bank_match_lookback_days: input.bank_match_lookback_days,
  })
  if (error) throw new Error(error.message)

  clearCompanyPaymentSettingsCache()
  /*
   * RPC คืนข้อมูลใหม่กลับมาในรูป JSONB อยู่แล้ว แต่เพื่อหลีกเลี่ยง
   * code duplicate (parseSettings + Number()-?? bug pattern) อาศัย
   * fetchCompanyPaymentSettings ซึ่งจัดการ schema/fallback ครบในที่เดียว
   */
  if (!data) throw new Error('บันทึกไม่สำเร็จ')
  return await fetchCompanyPaymentSettings(true)
}
