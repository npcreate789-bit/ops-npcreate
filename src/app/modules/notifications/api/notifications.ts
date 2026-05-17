import type { AppRole } from '../../../../shared/types/roles'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { fetchExecutiveDashboard } from '../../dashboard/api/dashboard'
import { buildSystemAlerts } from './buildSystemAlerts'
import { mockNotificationsApi } from './mockStore'
import type { UserNotification } from '../types'

import {
  buildLeadNotificationInput,
  isLeadNotification,
  mapNotificationRow,
} from '../leadNotification'

/** คีย์ที่ระบบสร้างจาก sync — ใช้ลบรายการที่หมดอายุโดยไม่ล้าง inbox ทั้งก้อน */
const SYSTEM_DEDUPE_PREFIXES = [
  'finance-',
  'onboarding-',
  'ads-',
  'tasks-',
  'content-',
  'crm-reminders',
  'daily-check-',
  'contract-expiring',
] as const

function isSystemDedupeKey(key: string): boolean {
  return SYSTEM_DEDUPE_PREFIXES.some((p) => key === p || key.startsWith(p))
}

function isPersistentNotificationKey(key: string): boolean {
  return isLeadNotification(key)
}

function mapRow(row: Record<string, unknown>): UserNotification {
  return mapNotificationRow(row)
}

export async function syncNotifications(
  userId: string,
  roles: AppRole[],
): Promise<void> {
  const dashboard = await fetchExecutiveDashboard(userId, roles)
  const inputs = await buildSystemAlerts(userId, roles, dashboard)

  if (!isSupabaseConfigured || !supabase) {
    await mockNotificationsApi.sync(userId, inputs)
    return
  }

  const payload = inputs.map((i) => ({
    user_id: userId,
    dedupe_key: i.dedupe_key,
    title: i.title,
    body: i.body,
    link: i.link,
    severity: i.severity,
  }))

  if (payload.length > 0) {
    const { error } = await supabase.from('user_notifications').upsert(payload, {
      onConflict: 'user_id,dedupe_key',
      ignoreDuplicates: false,
    })
    if (error) throw new Error(error.message)
  }

  const keys = inputs.map((i) => i.dedupe_key)

  const { data: stale, error: listErr } = await supabase
    .from('user_notifications')
    .select('id, dedupe_key')
    .eq('user_id', userId)

  if (listErr) throw new Error(listErr.message)

  const removeIds = (stale ?? [])
    .filter((r) => {
      const dk = r.dedupe_key as string
      if (isPersistentNotificationKey(dk)) return false
      if (keys.includes(dk)) return false
      if (keys.length > 0) return true
      return isSystemDedupeKey(dk)
    })
    .map((r) => r.id as string)

  if (removeIds.length > 0) {
    const { error: delErr } = await supabase
      .from('user_notifications')
      .delete()
      .in('id', removeIds)
    if (delErr) throw new Error(delErr.message)
  }
}

export async function listNotifications(userId: string): Promise<UserNotification[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockNotificationsApi.list(userId)
  }

  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    return mockNotificationsApi.unreadCount(userId)
  }

  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockNotificationsApi.markRead(userId, id)
    return
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

/** แจ้งเตือน Lead ที่ยังไม่อ่าน — สำหรับ toast เรียลไทม์ */
export async function listUnreadLeadNotifications(userId: string): Promise<UserNotification[]> {
  if (!isSupabaseConfigured || !supabase) {
    return mockNotificationsApi.listUnreadLeads(userId)
  }

  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .is('read_at', null)
    .like('dedupe_key', 'lead-new-%')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapRow)
}

export async function pushLeadNotification(
  userId: string,
  lead: { id: string; brand_name: string; contact_name?: string | null },
): Promise<void> {
  const input = buildLeadNotificationInput({ ...lead, owner_id: userId })
  if (!isSupabaseConfigured || !supabase) {
    await mockNotificationsApi.pushLead(userId, lead)
    return
  }

  const { error } = await supabase.from('user_notifications').upsert(
    {
      user_id: userId,
      dedupe_key: input.dedupe_key,
      title: input.title,
      body: input.body,
      link: input.link,
      severity: input.severity,
      read_at: null,
    },
    { onConflict: 'user_id,dedupe_key' },
  )
  if (error) throw new Error(error.message)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    await mockNotificationsApi.markAllRead(userId)
    return
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw new Error(error.message)
}
