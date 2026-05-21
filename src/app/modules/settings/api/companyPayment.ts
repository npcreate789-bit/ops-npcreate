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
    p_bank_match_auto_confirm_enabled: input.bank_match_auto_confirm_enabled,
    p_bank_match_amount_tolerance_baht: input.bank_match_amount_tolerance_baht,
    p_bank_match_lookback_days: input.bank_match_lookback_days,
  })
  if (error) throw new Error(error.message)

  clearCompanyPaymentSettingsCache()
  await fetchCompanyPaymentSettings(true)
  const row = data as Record<string, unknown> | null
  if (!row) throw new Error('บันทึกไม่สำเร็จ')
  return {
    bank_name: String(row.bank_name),
    account_number: String(row.account_number),
    account_name: String(row.account_name),
    promptpay_id: String(row.promptpay_id),
    payment_instructions_sla_hours: Number(row.payment_instructions_sla_hours) || 48,
    payment_verification_seconds: Number(row.payment_verification_seconds) || 90,
    auto_confirm_enabled: Boolean(row.auto_confirm_enabled),
    auto_confirm_max_amount: Number(row.auto_confirm_max_amount) || 50000,
    amount_tolerance_baht: Number(row.amount_tolerance_baht) ?? 1,
    require_reference_match: row.require_reference_match !== false,
    manual_review_min_amount: Number(row.manual_review_min_amount) || 100000,
    line_notify_slip_received: row.line_notify_slip_received !== false,
    line_notify_payment_confirmed: row.line_notify_payment_confirmed !== false,
    line_notify_slip_rejected: row.line_notify_slip_rejected !== false,
    line_notify_review_pending: row.line_notify_review_pending !== false,
    bank_match_auto_confirm_enabled: Boolean(row.bank_match_auto_confirm_enabled),
    bank_match_amount_tolerance_baht: Number(row.bank_match_amount_tolerance_baht) ?? 1,
    bank_match_lookback_days: Number(row.bank_match_lookback_days) || 14,
    updated_at: (row.updated_at as string) ?? null,
  }
}
