import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const PRIVILEGED = new Set(['ceo', 'operations', 'dev', 'admin', 'account', 'sales'])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const lineToken = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!lineToken || !supabaseUrl || !serviceKey || !anonKey) {
      return new Response('not configured', { status: 503, headers: corsHeaders })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('unauthorized', { status: 401, headers: corsHeaders })
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser()

    if (callerErr || !caller) {
      return new Response('unauthorized', { status: 401, headers: corsHeaders })
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)

    const roles = (callerRoles ?? []).map((r) => r.role as string)
    if (!roles.some((r) => PRIVILEGED.has(r))) {
      return new Response('forbidden', { status: 403, headers: corsHeaders })
    }

    const url = new URL(req.url)
    const messageId = url.searchParams.get('messageId')?.trim()
    if (!messageId || messageId.length > 128) {
      return new Response('bad request', { status: 400, headers: corsHeaders })
    }

    const lineRes = await fetch(
      `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
      { headers: { Authorization: `Bearer ${lineToken}` } },
    )

    if (!lineRes.ok) {
      return new Response('upstream error', { status: lineRes.status, headers: corsHeaders })
    }

    const contentType = lineRes.headers.get('content-type') ?? 'application/octet-stream'
    const bytes = await lineRes.arrayBuffer()

    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) {
    console.error('line-message-content', e)
    return new Response('internal', { status: 500, headers: corsHeaders })
  }
})
