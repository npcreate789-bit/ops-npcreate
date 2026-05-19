import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const STAFF_DOMAIN = 'npcreate.local'
const LOGIN_ID_RE = /^[a-z0-9._-]{3,32}$/

const PRIVILEGED_MANAGE = new Set(['ceo', 'operations', 'dev'])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole =
  | 'ceo'
  | 'operations'
  | 'sales'
  | 'account'
  | 'ads'
  | 'senior_ads'
  | 'content'
  | 'admin'
  | 'dev'
  | 'client'

type ManageAction = 'update' | 'delete' | 'reset_password'

interface ManageBody {
  action?: ManageAction
  user_id?: string
  full_name?: string
  login_id?: string
}

function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase()
}

function staffEmail(loginId: string): string {
  return `${loginId}@${STAFF_DOMAIN}`
}

function canEditCeoTarget(actorRoles: AppRole[], targetRoles: AppRole[]): boolean {
  if (!targetRoles.includes('ceo')) return true
  return actorRoles.includes('ceo')
}

function canAssignCeo(actorRoles: AppRole[]): boolean {
  return actorRoles.includes('ceo')
}

type AdminClient = ReturnType<typeof createClient>

const REQUIRED_REASSIGNMENTS: Array<{ table: string; column: string }> = [
  { table: 'leads', column: 'owner_id' },
  { table: 'customers', column: 'sales_owner_id' },
  { table: 'quotations', column: 'owner_id' },
  { table: 'campaigns', column: 'ads_owner_id' },
  { table: 'daily_metrics', column: 'created_by' },
  { table: 'payments', column: 'recorded_by' },
  { table: 'tasks', column: 'assignee_id' },
  { table: 'tasks', column: 'created_by' },
  { table: 'content_jobs', column: 'assignee_id' },
  { table: 'content_jobs', column: 'created_by' },
  { table: 'contract_renewals', column: 'owner_id' },
  { table: 'contract_renewals', column: 'created_by' },
  { table: 'creators', column: 'created_by' },
  { table: 'chat_messages', column: 'sender_id' },
  { table: 'brief_attachments', column: 'uploaded_by' },
]

const STORAGE_BUCKETS = ['leads', 'payments', 'briefs', 'chat-attachments'] as const

const NULLABLE_CLEAR: Array<{ table: string; column: string }> = [
  { table: 'customers', column: 'account_owner_id' },
  { table: 'customers', column: 'ads_owner_id' },
  { table: 'projects', column: 'account_owner_id' },
  { table: 'projects', column: 'ads_owner_id' },
]

/** Reassign rows that block profile/auth deletion (FK without ON DELETE CASCADE). */
async function listStorageObjectPaths(
  admin: AdminClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
  })
  if (error || !data?.length) {
    return []
  }

  const paths: string[] = []
  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) {
      paths.push(...(await listStorageObjectPaths(admin, bucket, path)))
    } else {
      paths.push(path)
    }
  }
  return paths
}

async function removeStoragePaths(
  admin: AdminClient,
  bucket: string,
  paths: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const chunkSize = 100
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize)
    const { error } = await admin.storage.from(bucket).remove(chunk)
    if (error) {
      console.error('removeStoragePaths', bucket, error)
      return { ok: false, error: error.message }
    }
  }
  return { ok: true }
}

/** Supabase forbids DELETE on storage.objects — list by owner, remove via Storage API. */
async function purgeStaffUserStorage(
  admin: AdminClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: owned, error: listErr } = await admin
    .schema('storage')
    .from('objects')
    .select('bucket_id, name')
    .eq('owner', userId)

  if (!listErr && owned?.length) {
    const byBucket = new Map<string, string[]>()
    for (const row of owned) {
      const bucket = row.bucket_id as string
      const name = row.name as string
      const paths = byBucket.get(bucket) ?? []
      paths.push(name)
      byBucket.set(bucket, paths)
    }

    for (const [bucket, paths] of byBucket) {
      const removed = await removeStoragePaths(admin, bucket, paths)
      if (!removed.ok) return removed
    }
    return { ok: true }
  }

  if (listErr) {
    console.warn('purgeStaffUserStorage list by owner failed; using prefix scan', listErr)
  }

  for (const bucket of STORAGE_BUCKETS) {
    const paths = await listStorageObjectPaths(admin, bucket, userId)
    if (!paths.length) continue
    const removed = await removeStoragePaths(admin, bucket, paths)
    if (!removed.ok) return removed
  }

  return { ok: true }
}

async function reassignStaffUserReferencesViaApi(
  admin: AdminClient,
  fromUserId: string,
  toUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const { table, column } of REQUIRED_REASSIGNMENTS) {
    const { error } = await admin
      .from(table)
      .update({ [column]: toUserId })
      .eq(column, fromUserId)
    if (error) {
      console.error('reassignStaffUserReferencesViaApi', table, column, error)
      return { ok: false, error: error.message }
    }
  }

  for (const { table, column } of NULLABLE_CLEAR) {
    const { error } = await admin
      .from(table)
      .update({ [column]: null })
      .eq(column, fromUserId)
    if (error) {
      console.error('reassignStaffUserReferencesViaApi clear', table, column, error)
      return { ok: false, error: error.message }
    }
  }

  return { ok: true }
}

async function reassignStaffUserReferences(
  admin: AdminClient,
  fromUserId: string,
  toUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (fromUserId === toUserId) {
    return { ok: false, error: 'ไม่สามารถโอนข้อมูลไปยังผู้ใช้คนเดียวกันได้' }
  }

  const { error: rpcErr } = await admin.rpc('reassign_staff_user_references', {
    p_from_user_id: fromUserId,
    p_to_user_id: toUserId,
  })

  if (!rpcErr) {
    return { ok: true }
  }

  const rpcMissing =
    rpcErr.message.includes('reassign_staff_user_references') &&
    (rpcErr.message.includes('does not exist') ||
      rpcErr.message.includes('Could not find the function'))

  if (!rpcMissing) {
    console.error('reassignStaffUserReferences rpc', rpcErr)
    return { ok: false, error: rpcErr.message }
  }

  console.warn('reassign_staff_user_references RPC missing; using API fallback')
  return reassignStaffUserReferencesViaApi(admin, fromUserId, toUserId)
}

async function deleteStaffProfile(
  admin: AdminClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin.from('profiles').delete().eq('id', userId)
  if (error) {
    console.error('deleteStaffProfile', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

function mapDeleteUserError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('database error deleting user')) {
    return 'ไม่สามารถลบผู้ใช้ได้ — ยังมีข้อมูลในระบบที่อ้างอิงบัญชีนี้ (ลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ)'
  }
  return message
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'ไม่ได้รับอนุญาต' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser()

    if (callerErr || !caller) {
      return json({ error: 'ไม่ได้รับอนุญาต' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: callerRoles, error: rolesReadErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    if (rolesReadErr) {
      console.error('manage-employee rolesReadErr', rolesReadErr)
      return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
    }

    const actorRoles = (callerRoles ?? []).map((r) => r.role as AppRole)
    if (!actorRoles.some((r) => PRIVILEGED_MANAGE.has(r))) {
      return json({ error: 'ไม่มีสิทธิ์จัดการบัญชีพนักงาน' }, 403)
    }

    const body = (await req.json()) as ManageBody
    const action = body.action
    const userId = body.user_id?.trim()

    if (!action || !userId) {
      return json({ error: 'ข้อมูลไม่ครบ' }, 400)
    }

    if (userId === caller.id && action === 'delete') {
      return json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' }, 400)
    }

    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, login_id, email, full_name, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) {
      return json({ error: profileErr.message }, 500)
    }
    if (!profile) {
      return json({ error: 'ไม่พบผู้ใช้' }, 404)
    }

    const { data: targetRoleRows, error: targetRolesErr } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (targetRolesErr) {
      return json({ error: targetRolesErr.message }, 500)
    }

    const targetRoles = (targetRoleRows ?? []).map((r) => r.role as AppRole)

    if (targetRoles.includes('client') && !targetRoles.some((r) => r !== 'client')) {
      return json(
        { error: 'บัญชีลูกค้าพอร์ทัล — ใช้วิซาร์ดลูกค้าเพื่อจัดการ หรือปิดการใช้งานแทนการลบ' },
        400,
      )
    }

    if (!canEditCeoTarget(actorRoles, targetRoles)) {
      return json({ error: 'เฉพาะ CEO เท่านั้นที่จัดการบัญชี CEO ได้' }, 403)
    }

    if (action === 'delete') {
      if (targetRoles.includes('dev') && !actorRoles.includes('dev')) {
        return json({ error: 'ไม่มีสิทธิ์ลบบัญชี Dev' }, 403)
      }

      const storagePurge = await purgeStaffUserStorage(admin, userId)
      if (!storagePurge.ok) {
        return json(
          { error: `ไม่สามารถลบไฟล์แนบของผู้ใช้ได้ — ${storagePurge.error}` },
          500,
        )
      }

      const reassign = await reassignStaffUserReferences(admin, userId, caller.id)
      if (!reassign.ok) {
        return json(
          {
            error: `ไม่สามารถโอนข้อมูลที่ผูกกับผู้ใช้นี้ได้ — ${reassign.error}`,
          },
          500,
        )
      }

      const profileDelete = await deleteStaffProfile(admin, userId)
      if (!profileDelete.ok) {
        return json(
          {
            error: `ยังลบโปรไฟล์ไม่ได้ — มีข้อมูลอ้างอิงอยู่: ${profileDelete.error}`,
          },
          400,
        )
      }

      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
      if (deleteErr) {
        console.error('manage-employee deleteUser', deleteErr)
        return json({ error: mapDeleteUserError(deleteErr.message) }, 400)
      }

      await admin.from('audit_logs').insert({
        actor_id: caller.id,
        action: 'user.delete',
        entity_type: 'profile',
        entity_id: userId,
        metadata: {
          login_id: profile.login_id,
          full_name: profile.full_name,
          roles: targetRoles,
          reassigned_to: caller.id,
        },
      })

      return json({ ok: true })
    }

    if (action === 'reset_password') {
      const password = generateTempPassword(12)
      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { must_change_password: true },
      })
      if (pwErr) {
        return json({ error: pwErr.message }, 400)
      }

      await admin
        .from('profiles')
        .update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      const { error: hintErr } = await admin.from('staff_password_hints').upsert({
        user_id: userId,
        temporary_password: password,
        must_change: true,
        issued_at: new Date().toISOString(),
        issued_by: caller.id,
      })
      if (hintErr) {
        return json({ error: hintErr.message }, 500)
      }

      await admin.from('audit_logs').insert({
        actor_id: caller.id,
        action: 'user.reset_password',
        entity_type: 'profile',
        entity_id: userId,
        metadata: { login_id: profile.login_id },
      })

      return json({ temporary_password: password })
    }

    if (action === 'update') {
      const fullName = body.full_name?.trim()
      const nextLoginId = body.login_id ? normalizeLoginId(body.login_id) : null

      if (fullName !== undefined && !fullName) {
        return json({ error: 'กรุณากรอกชื่อ-นามสกุล' }, 400)
      }

      if (nextLoginId && !LOGIN_ID_RE.test(nextLoginId)) {
        return json({
          error: 'รหัสผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, . _ - (3–32 ตัวอักษร)',
        }, 400)
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (fullName !== undefined) updates.full_name = fullName

      if (nextLoginId && nextLoginId !== profile.login_id) {
        const { data: taken } = await admin
          .from('profiles')
          .select('id')
          .eq('login_id', nextLoginId)
          .neq('id', userId)
          .maybeSingle()

        if (taken) {
          return json({ error: 'รหัสผู้ใช้นี้ถูกใช้แล้ว' }, 409)
        }

        const email = staffEmail(nextLoginId)
        const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
          email,
          user_metadata: { login_id: nextLoginId },
        })
        if (authErr) {
          return json({ error: authErr.message }, 400)
        }

        updates.login_id = nextLoginId
        updates.email = email
      }

      if (Object.keys(updates).length > 1) {
        const { error: upErr } = await admin.from('profiles').update(updates).eq('id', userId)
        if (upErr) {
          return json({ error: upErr.message }, 500)
        }
      }

      await admin.from('audit_logs').insert({
        actor_id: caller.id,
        action: 'user.update',
        entity_type: 'profile',
        entity_id: userId,
        metadata: {
          full_name: fullName ?? profile.full_name,
          login_id: nextLoginId ?? profile.login_id,
        },
      })

      return json({
        id: userId,
        full_name: fullName ?? profile.full_name,
        login_id: nextLoginId ?? profile.login_id,
        email: (updates.email as string | undefined) ?? profile.email,
      })
    }

    return json({ error: 'action ไม่รองรับ' }, 400)
  } catch (e) {
    console.error('manage-employee', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
