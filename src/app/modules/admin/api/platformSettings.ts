import { logAudit } from '../../../../shared/audit/logAudit'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { DefaultLeadOwnerSetting, LeadOwnerOption } from '../types'
import { mockAdminApi } from './mockStore'

const SETTING_KEY = 'default_lead_owner_id'

function parseJsonbUuid(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.replace(/^"|"$/g, '').trim()
    return trimmed || null
  }
  return null
}

function displayName(option: LeadOwnerOption): string {
  return option.full_name?.trim() || option.login_id || option.email
}

export async function listSalesLeadOwnerOptions(): Promise<LeadOwnerOption[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.listSalesLeadOwnerOptions()
  }

  const { data: roleRows, error: rErr } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'sales')

  if (rErr) throw new Error(rErr.message)

  const ids = [...new Set((roleRows ?? []).map((r) => r.user_id as string))]
  if (ids.length === 0) return []

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, login_id, email, full_name')
    .in('id', ids)
    .eq('is_active', true)
    .order('full_name')

  if (pErr) throw new Error(pErr.message)

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    login_id: (p.login_id as string) ?? '',
    email: p.email as string,
    full_name: (p.full_name as string | null) ?? null,
  }))
}

export async function getDefaultLeadOwnerSetting(): Promise<DefaultLeadOwnerSetting> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.getDefaultLeadOwnerSetting()
  }

  const { data: row, error } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const ownerId = parseJsonbUuid(row?.value)
  if (!ownerId) {
    return { ownerId: null, ownerLabel: null, usesAutoFallback: true }
  }

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, login_id, email, full_name, is_active')
    .eq('id', ownerId)
    .maybeSingle()

  if (pErr) throw new Error(pErr.message)

  if (!profile || !profile.is_active) {
    return {
      ownerId,
      ownerLabel: null,
      usesAutoFallback: true,
      invalidOwnerId: true,
    }
  }

  return {
    ownerId,
    ownerLabel: displayName({
      id: profile.id as string,
      login_id: (profile.login_id as string) ?? '',
      email: profile.email as string,
      full_name: (profile.full_name as string | null) ?? null,
    }),
    usesAutoFallback: false,
  }
}

export async function setDefaultLeadOwnerSetting(
  ownerId: string | null,
  actorId: string,
): Promise<DefaultLeadOwnerSetting> {
  if (!isSupabaseConfigured || !supabase) {
    return mockAdminApi.setDefaultLeadOwnerSetting(ownerId)
  }

  if (ownerId) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', ownerId)
      .eq('is_active', true)
      .maybeSingle()

    if (pErr) throw new Error(pErr.message)
    if (!profile) throw new Error('ไม่พบ Sales ที่เลือก หรือบัญชีถูกปิด')

    const { data: roleRow, error: rErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', ownerId)
      .eq('role', 'sales')
      .maybeSingle()

    if (rErr) throw new Error(rErr.message)
    if (!roleRow) throw new Error('ผู้ใช้ที่เลือกต้องมีบทบาท Sales')

    const { error: uErr } = await supabase.from('platform_settings').upsert({
      key: SETTING_KEY,
      value: ownerId,
      updated_at: new Date().toISOString(),
    })

    if (uErr) throw new Error(uErr.message)
  } else {
    const { error: dErr } = await supabase
      .from('platform_settings')
      .delete()
      .eq('key', SETTING_KEY)

    if (dErr) throw new Error(dErr.message)
  }

  await logAudit(
    ownerId ? 'platform_setting.update' : 'platform_setting.clear',
    'platform_settings',
    SETTING_KEY,
    { key: SETTING_KEY, owner_id: ownerId, actor_id: actorId },
  )

  return getDefaultLeadOwnerSetting()
}
