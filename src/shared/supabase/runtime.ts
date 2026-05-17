import { isSupabaseConfigured } from './client'

/**
 * Local dev only — mock CEO session and skip auth guards when Supabase env is missing.
 * Never enabled in production builds.
 */
export const allowDevAuthBypass = !isSupabaseConfigured && !import.meta.env.PROD

export function requiresSupabaseInProduction(): boolean {
  return import.meta.env.PROD && !isSupabaseConfigured
}
