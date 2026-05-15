import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export interface AuditLogRow {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  actor_email: string | null
  actor_name: string | null
}

const MOCK_LOGS: AuditLogRow[] = [
  {
    id: '1',
    action: 'user.roles_update',
    entity_type: 'profile',
    entity_id: null,
    metadata: { roles: ['content'] },
    created_at: new Date().toISOString(),
    actor_email: 'ceo@npcreate.local',
    actor_name: 'CEO Demo',
  },
]

export async function listAuditLogs(limit = 80): Promise<AuditLogRow[]> {
  if (!isSupabaseConfigured || !supabase) return MOCK_LOGS

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, metadata, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const actorIds = [
    ...new Set((data ?? []).map((r) => r.actor_id as string | null).filter(Boolean)),
  ] as string[]

  let profileMap = new Map<string, { email: string; full_name: string | null }>()
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', actorIds)
    profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        { email: p.email as string, full_name: p.full_name as string | null },
      ]),
    )
  }

  return (data ?? []).map((row) => {
    const actor = row.actor_id ? profileMap.get(row.actor_id as string) : undefined
    return {
      id: row.id as string,
      action: row.action as string,
      entity_type: row.entity_type as string,
      entity_id: (row.entity_id as string | null) ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at as string,
      actor_email: actor?.email ?? null,
      actor_name: actor?.full_name ?? null,
    }
  })
}
