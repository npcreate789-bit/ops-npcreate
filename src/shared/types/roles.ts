/** System roles — must match `public.app_role` in Supabase migrations */
export const APP_ROLES = [
  'ceo',
  'operations',
  'sales',
  'account',
  'ads',
  'senior_ads',
  'content',
  'admin',
  'dev',
  'client',
] as const

export type AppRole = (typeof APP_ROLES)[number]

export const ROLE_LABELS: Record<AppRole, string> = {
  ceo: 'CEO',
  operations: 'Operations',
  sales: 'Sales',
  account: 'Account',
  ads: 'Ads Specialist',
  senior_ads: 'Senior Ads',
  content: 'Content / Creative',
  admin: 'Admin / Finance',
  dev: 'Dev / Automation',
  client: 'Client',
}
