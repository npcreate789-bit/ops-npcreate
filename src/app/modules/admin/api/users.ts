import { logAudit } from '../../../../shared/audit/logAudit'
import { canAssignCeoRole, canEditCeoUserRoles } from '../access'
import type { AppRole } from '../../../../shared/types/roles'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { setClientCustomerAccess } from '../../client/api/clientReport'
import type { AdminUserRow } from '../types'
import { mockAdminApi } from './mockStore'

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  if (!isSupabaseConfigured || !supabase) return mockAdminApi.listUsers()

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, login_id, email, full_name, is_active, must_change_password, created_at')
    .order('email')

  if (pErr) throw pErr

  const [
    { data: roleRows, error: rErr },
    { data: clientLinks, error: cErr },
    { data: passwordHints, error: hErr },
  ] = await Promise.all([
    supabase.from('user_roles').select('user_id, role'),
    supabase.from('client_customer_access').select('user_id, customer_id'),
    supabase.from('staff_password_hints').select('user_id, temporary_password'),
  ])

  if (rErr) throw rErr
  if (cErr) throw cErr
  if (hErr && hErr.code !== 'PGRST116') throw hErr

  const passwordByUser = new Map<string, string>()
  for (const row of passwordHints ?? []) {
    passwordByUser.set(row.user_id as string, row.temporary_password as string)
  }

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
    login_id: (p.login_id as string) ?? p.email.split('@')[0]?.toLowerCase() ?? '',
    email: p.email,
    full_name: p.full_name,
    is_active: p.is_active,
    must_change_password: Boolean(p.must_change_password),
    temporary_password: passwordByUser.get(p.id) ?? null,
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

function assertCanSetUserRoles(
  actorRoles: AppRole[],
  targetRoles: AppRole[],
  nextRoles: AppRole[],
): void {
  if (!canEditCeoUserRoles(actorRoles, targetRoles)) {
    throw new Error('เฉพาะ CEO เท่านั้นที่จัดการบทบาทของผู้ใช้ CEO ได้')
  }
  const touchesCeo = targetRoles.includes('ceo') || nextRoles.includes('ceo')
  if (touchesCeo && !canAssignCeoRole(actorRoles)) {
    throw new Error('เฉพาะ CEO เท่านั้นที่มอบหรือถอนบทบาท CEO ได้')
  }
}

export async function setUserRoles(
  userId: string,
  roles: AppRole[],
  actorRoles: AppRole[] = [],
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const users = await mockAdminApi.listUsers()
    const target = users.find((u) => u.id === userId)
    if (target) assertCanSetUserRoles(actorRoles, target.roles, roles)
    await mockAdminApi.setUserRoles(userId, roles)
    return
  }

  const { data: existing, error: readErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)

  if (readErr) throw readErr

  const targetRoles = (existing ?? []).map((r) => r.role as AppRole)
  assertCanSetUserRoles(actorRoles, targetRoles, roles)

  const current = new Set(targetRoles)
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
