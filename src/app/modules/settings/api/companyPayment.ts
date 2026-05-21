import { clearCompanyPaymentSettingsCache, fetchCompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import type { CompanyPaymentSettings } from '../../../../shared/payment/companyPaymentSettings'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export async function loadCompanyPaymentSettingsForEdit(): Promise<CompanyPaymentSettings> {
  return fetchCompanyPaymentSettings(true)
}

export async function saveCompanyPaymentSettings(input: {
  bank_name: string
  account_number: string
  account_name: string
  promptpay_id: string
  payment_instructions_sla_hours: number
}): Promise<CompanyPaymentSettings> {
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
    updated_at: (row.updated_at as string) ?? null,
  }
}
