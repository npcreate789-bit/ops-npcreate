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
  payment_verification_seconds: number
  auto_confirm_enabled: boolean
  auto_confirm_max_amount: number
  amount_tolerance_baht: number
  require_reference_match: boolean
  manual_review_min_amount: number
  line_notify_slip_received: boolean
  line_notify_payment_confirmed: boolean
  line_notify_slip_rejected: boolean
  line_notify_review_pending: boolean
  bank_match_auto_confirm_enabled: boolean
  bank_match_amount_tolerance_baht: number
  bank_match_lookback_days: number
  updated_at?: string | null
}

export const DEFAULT_COMPANY_PAYMENT_SETTINGS: CompanyPaymentSettings = {
  bank_name: PAYMENT_BANK_NAME,
  account_number: PAYMENT_ACCOUNT_NUMBER,
  account_name: PAYMENT_ACCOUNT_NAME,
  promptpay_id: PAYMENT_PROMPTPAY_ID,
  payment_instructions_sla_hours: 48,
  payment_verification_seconds: 90,
  auto_confirm_enabled: false,
  auto_confirm_max_amount: 50000,
  amount_tolerance_baht: 1,
  require_reference_match: true,
  manual_review_min_amount: 100000,
  line_notify_slip_received: true,
  line_notify_payment_confirmed: true,
  line_notify_slip_rejected: true,
  line_notify_review_pending: true,
  bank_match_auto_confirm_enabled: false,
  bank_match_amount_tolerance_baht: 1,
  bank_match_lookback_days: 14,
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
    payment_verification_seconds: Number(r.payment_verification_seconds) || 90,
    auto_confirm_enabled: Boolean(r.auto_confirm_enabled),
    auto_confirm_max_amount: Number(r.auto_confirm_max_amount) || 50000,
    amount_tolerance_baht: Number(r.amount_tolerance_baht) ?? 1,
    require_reference_match: r.require_reference_match !== false,
    manual_review_min_amount: Number(r.manual_review_min_amount) || 100000,
    line_notify_slip_received: r.line_notify_slip_received !== false,
    line_notify_payment_confirmed: r.line_notify_payment_confirmed !== false,
    line_notify_slip_rejected: r.line_notify_slip_rejected !== false,
    line_notify_review_pending: r.line_notify_review_pending !== false,
    bank_match_auto_confirm_enabled: Boolean(r.bank_match_auto_confirm_enabled),
    bank_match_amount_tolerance_baht: Number(r.bank_match_amount_tolerance_baht) ?? 1,
    bank_match_lookback_days: Number(r.bank_match_lookback_days) || 14,
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
