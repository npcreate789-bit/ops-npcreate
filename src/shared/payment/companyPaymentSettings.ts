import {
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_ACCOUNT_NUMBER,
  PAYMENT_BANK_NAME,
  PAYMENT_PROMPTPAY_ID,
} from './companyPayment'
import { isSupabaseConfigured, supabase } from '../supabase/client'

export interface CompanyPaymentSettings {
  bank_name: string
  account_number: string
  account_name: string
  promptpay_id: string
  payment_instructions_sla_hours: number
  updated_at?: string | null
}

export const DEFAULT_COMPANY_PAYMENT_SETTINGS: CompanyPaymentSettings = {
  bank_name: PAYMENT_BANK_NAME,
  account_number: PAYMENT_ACCOUNT_NUMBER,
  account_name: PAYMENT_ACCOUNT_NAME,
  promptpay_id: PAYMENT_PROMPTPAY_ID,
  payment_instructions_sla_hours: 48,
}

let cached: CompanyPaymentSettings | null = null

function parseSettings(data: unknown): CompanyPaymentSettings | null {
  if (!data || typeof data !== 'object') return null
  const r = data as Record<string, unknown>
  const bank = String(r.bank_name ?? '').trim()
  const account = String(r.account_number ?? '').trim()
  const name = String(r.account_name ?? '').trim()
  const pp = String(r.promptpay_id ?? '').trim()
  if (!bank || !account || !name || !pp) return null
  return {
    bank_name: bank,
    account_number: account,
    account_name: name,
    promptpay_id: pp,
    payment_instructions_sla_hours: Number(r.payment_instructions_sla_hours) || 48,
    updated_at: (r.updated_at as string) ?? null,
  }
}

export function getCachedCompanyPaymentSettings(): CompanyPaymentSettings {
  return cached ?? DEFAULT_COMPANY_PAYMENT_SETTINGS
}

export function clearCompanyPaymentSettingsCache(): void {
  cached = null
}

export async function fetchCompanyPaymentSettings(
  force = false,
): Promise<CompanyPaymentSettings> {
  if (!force && cached) return cached

  if (!isSupabaseConfigured || !supabase) {
    cached = DEFAULT_COMPANY_PAYMENT_SETTINGS
    return cached
  }

  const { data, error } = await supabase.rpc('get_company_payment_settings')
  if (error) throw new Error(error.message)
  cached = parseSettings(data) ?? DEFAULT_COMPANY_PAYMENT_SETTINGS
  return cached
}
