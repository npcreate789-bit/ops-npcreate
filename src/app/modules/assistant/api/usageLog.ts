import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export async function logAssistantUsage(
  userId: string,
  audience: 'staff' | 'client',
  promptKey: string,
  customerId?: string | null,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.from('assistant_usage_logs').insert({
    user_id: userId,
    audience,
    prompt_key: promptKey,
    customer_id: customerId ?? null,
  })

  if (error) console.warn('[assistant_usage]', error.message)
}
