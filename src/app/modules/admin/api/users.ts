import { logAudit } from '../../../../shared/audit/logAudit'
import type { AppRole } from '../../../../shared/types/roles'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { setClientCustomerAccess } from '../../client/api/clientReport'
import type { AdminUserRow } from '../types'
import { mockAdminApi } from './mockStore'

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  if (!isSupabaseConfigured || !supabase) return mockAdminApi.listUsers()

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_active, created_at')
    .order('email')

  if (pErr) throw pErr

  const [{ data: roleRows, error: rErr }, { data: clientLinks, error: cErr }] =
    await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('client_customer_access').select('user_id, customer_id'),
    ])

  if (rErr) throw rErr
  if (cErr) throw cErr

  const rolesByUser = new Map<string, AppRole[]>()
  const clientByUser = new Map<string, string>()
  for (const row of clientLinks ?? []) {
    clientByUser.set(row.user_id as string, row.customer_id as string)
  }
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? []
    list.push(row.role as AppRole)
    rolesByUser.set(row.user_id, list)
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    is_active: p.is_active,
    created_at: p.created_at,
    roles: rolesByUser.get(p.id) ?? [],
    client_customer_id: clientByUser.get(p.id) ?? null,
  }))
}

export { getClientCustomerAccess } from '../../client/api/clientReport'
export { setClientCustomerAccess }

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockAdminApi.setUserActive(userId, isActive)
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
  await logAudit(isActive ? 'user.activate' : 'user.deactivate', 'profile', userId)
}

export async function setUserRoles(userId: string, roles: AppRole[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockAdminApi.setUserRoles(userId, roles)
    return
  }

  const { data: existing, error: readErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (readErr) throw readErr

  const current = new Set((existing ?? []).map((r) => r.role as AppRole))
  const next = new Set(roles)

  const toAdd = roles.filter((r) => !current.has(r))
  const toRemove = [...current].filter((r) => !next.has(r))

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .in('role', toRemove)
    if (error) throw error
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from('user_roles').insert(
      toAdd.map((role) => ({ user_id: userId, role })),
    )
    if (error) throw error
  }

  if (toRemove.includes('client')) {
    await setClientCustomerAccess(userId, null)
  }

  await logAudit('user.roles_update', 'profile', userId, { roles })
}
