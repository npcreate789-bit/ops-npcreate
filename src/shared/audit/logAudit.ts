import { isSupabaseConfigured, supabase } from '../supabase/client'

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.rpc('log_audit', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId ?? null,
    p_metadata: metadata,
  })

  if (error) console.warn('[audit]', error.message)
}
