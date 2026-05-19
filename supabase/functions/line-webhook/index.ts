import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function verifyLineSignature(
  body: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
  return expected === signature
}

interface LineTextMessage {
  type: string
  id?: string
  text?: string
}

interface LineEvent {
  type: string
  replyToken?: string
  source?: { type?: string; userId?: string }
  message?: LineTextMessage
  timestamp?: number
}

interface LineWebhookBody {
  destination?: string
  events?: LineEvent[]
}

async function findLeadIdForLineUser(
  admin: ReturnType<typeof createClient>,
  lineUserId: string,
): Promise<string | null> {
  const { data: byOa } = await admin
    .from('leads')
    .select('id')
    .eq('line_oa_chat_user_id', lineUserId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (byOa?.id) return byOa.id as string

  const { data: byLogin } = await admin
    .from('leads')
    .select('id')
    .eq('line_user_id', lineUserId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (byLogin?.id as string | undefined) ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const channelSecret = Deno.env.get('LINE_MESSAGING_CHANNEL_SECRET')?.trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!channelSecret || !supabaseUrl || !serviceKey) {
      console.error('line-webhook missing env')
      return json({ error: 'not configured' }, 503)
    }

    const rawBody = await req.text()
    const signature = req.headers.get('x-line-signature')

    if (!(await verifyLineSignature(rawBody, signature, channelSecret))) {
      return json({ error: 'invalid signature' }, 401)
    }

    const payload = JSON.parse(rawBody) as LineWebhookBody
    const events = payload.events ?? []

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    for (const event of events) {
      if (event.type !== 'message') continue
      if (event.source?.type !== 'user') continue
      const lineUserId = event.source.userId?.trim()
      if (!lineUserId) continue

      const msg = event.message
      if (!msg || msg.type !== 'text') continue
      const text = msg.text?.trim()
      if (!text) continue

      const leadId = await findLeadIdForLineUser(admin, lineUserId)
      if (!leadId) {
        console.warn('line-webhook: no lead for', lineUserId)
        continue
      }

      const row: Record<string, unknown> = {
        lead_id: leadId,
        line_user_id: lineUserId,
        direction: 'inbound',
        body: text,
        message_type: 'text',
      }
      if (msg.id) row.line_message_id = msg.id

      const { error: insErr } = await admin.from('lead_line_messages').insert(row)
      if (insErr) {
        if (insErr.code === '23505') continue
        console.error('line-webhook insert', insErr)
      }
    }

    return json({ ok: true })
  } catch (e) {
    console.error('line-webhook', e)
    return json({ error: 'internal' }, 500)
  }
})
