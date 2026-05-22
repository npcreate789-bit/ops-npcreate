import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { notifyProjectStatusLine } from '../_shared/projectStatusLineNotify.ts'
import { constantTimeEqual } from '../_shared/paymentEdgeAuth.ts'
import type { ProjectStatusLineEvent } from '../_shared/projectStatusLineMessages.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-payment-edge-secret',
}

const STAFF_ROLES = new Set([
  'ceo',
  'admin',
  'dev',
  'account',
  'operations',
  'sales',
])

const ALLOWED_EVENTS: ProjectStatusLineEvent[] = [
  'in_progress',
  'waiting_approval',
  'completed',
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function headerSecretOk(req: Request): boolean {
  const expected = Deno.env.get('PAYMENT_EDGE_SECRET')?.trim()
  if (!expected) return false
  const got = req.headers.get('x-payment-edge-secret')?.trim()
  if (!got) return false
  return constantTimeEqual(got, expected)
}

async function staffUserOk(
  admin: ReturnType<typeof createClient>,
  req: Request,
): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')?.trim()
  if (!authHeader?.startsWith('Bearer ')) return false
  const jwt = authHeader.slice(7).trim()
  if (!jwt) return false

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData.user?.id) return false

  const { data: roles, error: roleErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)

  if (roleErr || !roles?.length) return false
  return roles.some((r) => STAFF_ROLES.has(String(r.role)))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const body = (await req.json().catch(() => null)) as {
      project_id?: string
      event?: ProjectStatusLineEvent
    } | null

    const projectId = body?.project_id?.trim()
    const event = body?.event
    if (!projectId || !event || !ALLOWED_EVENTS.includes(event)) {
      return json({ error: 'project_id and valid event required' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const allowed = headerSecretOk(req) || (await staffUserOk(admin, req))
    if (!allowed) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const result = await notifyProjectStatusLine(admin, projectId, event)
    return json({ ok: true, ...result })
  } catch (e) {
    console.error('notify-project-status-line', e)
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
  }
})
