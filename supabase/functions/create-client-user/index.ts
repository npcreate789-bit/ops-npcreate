import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const STAFF_DOMAIN = 'npcreate.local'
const LOGIN_ID_RE = /^[a-z0-9._-]{3,32}$/
const PRIVILEGED_CREATE = new Set(['ceo', 'operations', 'dev'])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateBody {
  login_id?: string
  full_name?: string
  customer_id?: string
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

function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
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
      console.error('create-client-user rolesReadErr', rolesReadErr)
      return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
    }

    const creatorRoles = (callerRoles ?? []).map((r) => r.role as string)
    if (!creatorRoles.some((r) => PRIVILEGED_CREATE.has(r))) {
      return json({ error: 'ไม่มีสิทธิ์สร้างบัญชีลูกค้า (เฉพาะ CEO / ผู้จัดการ)' }, 403)
    }

    const body = (await req.json()) as CreateBody
    const loginId = normalizeLoginId(body.login_id ?? '')
    const fullName = (body.full_name ?? '').trim()
    const customerId = body.customer_id?.trim() ?? ''
    const password = generateTempPassword(12)

    if (!LOGIN_ID_RE.test(loginId)) {
      return json({
        error: 'รหัสผู้ใช้ใช้ได้เฉพาะ a-z, 0-9, . _ - (3–32 ตัวอักษร)',
      }, 400)
    }

    if (!fullName) {
      return json({ error: 'กรุณากรอกชื่อผู้ใช้งาน' }, 400)
    }

    if (!customerId) {
      return json({ error: 'กรุณาเลือกลูกค้า' }, 400)
    }

    const { data: customer, error: customerErr } = await admin
      .from('customers')
      .select('id, brand_name')
      .eq('id', customerId)
      .maybeSingle()

    if (customerErr) {
      return json({ error: customerErr.message }, 500)
    }

    if (!customer) {
      return json({ error: 'ไม่พบลูกค้าในระบบ' }, 404)
    }

    const { data: existingLink } = await admin
      .from('client_customer_access')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle()

    if (existingLink) {
      return json({ error: 'ลูกค้ารายนี้มีบัญชีพอร์ทัลแล้ว — ใช้หน้าจัดการผู้ใช้เพื่อรีเซ็ต' }, 409)
    }

    const { data: taken } = await admin
      .from('profiles')
      .select('id')
      .eq('login_id', loginId)
      .maybeSingle()

    if (taken) {
      return json({ error: 'รหัสผู้ใช้นี้ถูกใช้แล้ว' }, 409)
    }

    const email = staffEmail(loginId)

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        login_id: loginId,
        full_name: fullName,
        must_change_password: true,
      },
    })

    if (createErr || !created.user) {
      const msg = createErr?.message ?? 'สร้างบัญชีไม่สำเร็จ'
      if (msg.toLowerCase().includes('already')) {
        return json({ error: 'รหัสผู้ใช้หรืออีเมลภายในนี้ถูกใช้แล้ว' }, 409)
      }
      return json({ error: msg }, 400)
    }

    const userId = created.user.id

    try {
      await admin
        .from('profiles')
        .update({
          full_name: fullName,
          login_id: loginId,
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
      if (hintErr) throw hintErr

      const { error: roleErr } = await admin.from('user_roles').insert({
        user_id: userId,
        role: 'client',
      })
      if (roleErr) throw roleErr

      const { error: linkErr } = await admin.from('client_customer_access').insert({
        user_id: userId,
        customer_id: customerId,
      })
      if (linkErr) throw linkErr

      await admin.from('audit_logs').insert({
        actor_id: caller.id,
        action: 'user.create_client',
        entity_type: 'profile',
        entity_id: userId,
        metadata: {
          login_id: loginId,
          customer_id: customerId,
          brand_name: customer.brand_name,
          full_name: fullName,
        },
      })
    } catch (inner) {
      await admin.auth.admin.deleteUser(userId)
      throw inner
    }

    return json({
      id: userId,
      login_id: loginId,
      email,
      full_name: fullName,
      customer_id: customerId,
      brand_name: customer.brand_name,
      temporary_password: password,
    })
  } catch {
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
