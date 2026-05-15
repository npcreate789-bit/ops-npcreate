import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  return value.includes('your-project') || value.includes('your-anon-key') || value.includes('xxxxxxxx')
}

export const isSupabaseConfigured = Boolean(
  url && anonKey && !isPlaceholder(url) && !isPlaceholder(anonKey),
)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null
