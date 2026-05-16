import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export interface AuditLogRow {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
}

export interface ListAuditFilters {
  actor_id?: string
  date_from?: string
  date_to?: string
  action_prefix?: string
  entity_type?: string
  limit?: number
}

export interface ActivityActorOption {
  id: string
  label: string
}

const MOCK_LOGS: AuditLogRow[] = [
  {
    id: '1',
    action: 'lead.create',
    entity_type: 'lead',
    entity_id: 'demo-lead-1',
    metadata: { brand_name: 'Demo Brand' },
    created_at: new Date().toISOString(),
    actor_id: null,
    actor_email: 'sales@npcreate.local',
    actor_name: 'Sales Demo',
  },
  {
    id: '2',
    action: 'user.roles_update',
    entity_type: 'profile',
    entity_id: null,
    metadata: { roles: ['content'] },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    actor_id: null,
    actor_email: 'ceo@npcreate.local',
    actor_name: 'CEO Demo',
  },
]

function endOfDayIso(dateStr: string): string {
  return `${dateStr}T23:59:59.999Z`
}

export async function listAuditLogs(
  filters: ListAuditFilters = {},
): Promise<AuditLogRow[]> {
  const limit = filters.limit ?? 150

  if (!isSupabaseConfigured || !supabase) {
    let rows = [...MOCK_LOGS]
    if (filters.actor_id) rows = rows.filter((r) => r.actor_id === filters.actor_id)
    if (filters.entity_type) rows = rows.filter((r) => r.entity_type === filters.entity_type)
    if (filters.action_prefix) {
      const p = `${filters.action_prefix}.`
      rows = rows.filter((r) => r.action.startsWith(p) || r.action === filters.action_prefix)
    }
    return rows.slice(0, limit)
  }

  let query = supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, metadata, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters.actor_id) query = query.eq('actor_id', filters.actor_id)
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00.000Z`)
  if (filters.date_to) query = query.lte('created_at', endOfDayIso(filters.date_to))
  if (filters.action_prefix) {
    const prefix = filters.action_prefix
    query = query.or(`action.eq.${prefix},action.like.${prefix}.%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const actorIds = [
    ...new Set((data ?? []).map((r) => r.actor_id as string | null).filter(Boolean)),
  ] as string[]

  let profileMap = new Map<string, { email: string; full_name: string | null; login_id: string | null }>()
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, login_id')
      .in('id', actorIds)
    profileMap = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        {
          email: p.email as string,
          full_name: p.full_name as string | null,
          login_id: (p.login_id as string | null) ?? null,
        },
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
      actor_id: (row.actor_id as string | null) ?? null,
      actor_email: actor?.email ?? null,
      actor_name: actor?.full_name ?? null,
    }
  })
}

/** รายชื่อพนักงานสำหรับกรองบันทึกกิจกรรม */
export async function listActivityActors(): Promise<ActivityActorOption[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [
      { id: 'ceo', label: 'CEO Demo' },
      { id: 'sales', label: 'Sales Demo' },
    ]
  }

  const [{ data: profiles, error: pErr }, { data: roleRows, error: rErr }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, login_id')
      .eq('is_active', true)
      .order('full_name'),
    supabase.from('user_roles').select('user_id, role'),
  ])

  if (pErr) throw new Error(pErr.message)
  if (rErr) throw new Error(rErr.message)

  const rolesByUser = new Map<string, string[]>()
  for (const row of roleRows ?? []) {
    const uid = row.user_id as string
    const list = rolesByUser.get(uid) ?? []
    list.push(row.role as string)
    rolesByUser.set(uid, list)
  }

  return (profiles ?? [])
    .filter((p) => {
      const uid = p.id as string
      const roles = rolesByUser.get(uid) ?? []
      if (roles.length === 0) return true
      return roles.some((r) => r !== 'client')
    })
    .map((p) => ({
      id: p.id as string,
      label:
        (p.full_name as string | null) ||
        (p.login_id as string | null) ||
        (p.email as string),
    }))
}
