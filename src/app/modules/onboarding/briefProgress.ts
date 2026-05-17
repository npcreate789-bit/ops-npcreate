import type { OnboardingForm, OnboardingFormInput } from './types'

const BRIEF_FIELD_KEYS: (keyof OnboardingFormInput)[] = [
  'tiktok_shop_url',
  'product_links',
  'pricing_info',
  'promotion_info',
  'profit_margin',
  'commission_info',
  'target_roi',
  'daily_ad_budget',
  'existing_content',
  'ads_account_info',
  'seller_account_info',
  'business_center_info',
  'notes',
]

function isBriefFieldFilled(
  key: keyof OnboardingFormInput,
  value: OnboardingFormInput[keyof OnboardingFormInput],
): boolean {
  if (key === 'target_roi' || key === 'daily_ad_budget') {
    return value != null && !Number.isNaN(Number(value))
  }
  return typeof value === 'string' && value.trim().length > 0
}

/** ความครบของฟอร์มบรีฟฝั่งลูกค้า (ไม่ใช่ checklist ทีม Account) */
export function calcBriefFormProgress(
  form: Partial<OnboardingFormInput> | OnboardingForm | null | undefined,
): number {
  if (!form) return 0
  const filled = BRIEF_FIELD_KEYS.filter((key) =>
    isBriefFieldFilled(key, form[key] as OnboardingFormInput[keyof OnboardingFormInput]),
  ).length
  return Math.round((filled / BRIEF_FIELD_KEYS.length) * 100)
}
