import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { summarizeLineInboundMessage, type LineInboundMessage } from './lineMessageSummary.ts'

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

interface LineEvent {
  type: string
  replyToken?: string
  source?: { type?: string; userId?: string }
  message?: LineInboundMessage
  timestamp?: number
}

interface LineWebhookBody {
  destination?: string
  events?: LineEvent[]
}

async function buildInboundReplyMetadata(
  admin: ReturnType<typeof createClient>,
  leadId: string,
  quotedMessageId: string | undefined,
): Promise<Record<string, unknown>> {
  const quoted = quotedMessageId?.trim()
  if (!quoted) return {}

  const { data: parent, error: parentErr } = await admin
    .from('lead_line_messages')
    .select('id, direction, body, message_type, deleted_at')
    .eq('lead_id', leadId)
    .eq('line_message_id', quoted)
    .maybeSingle()

  if (parentErr) {
    console.warn('line-webhook reply parent lookup', quoted, parentErr.message)
  }

  if (!parent) {
    console.warn(
      'line-webhook: quoted parent not in CRM —',
      quoted,
      '(ข้อความอาจส่งจาก chat.line.biz ก่อนบันทึกในระบบ)',
    )
    return {
      quoted_line_message_id: quoted,
      reply_from: 'outbound',
      reply_preview: 'ข้อความจากทีม (LINE)',
    }
  }

  const direction = parent.direction as string
  const from = direction === 'inbound' || direction === 'outbound' ? direction : 'inbound'
  let preview = (parent.body as string)?.trim() || ''
  if ((parent.message_type as string) === 'image') preview = 'รูปภาพ'
  if ((parent.message_type as string) === 'sticker') preview = 'สติกเกอร์'
  if (preview.length > 100) preview = `${preview.slice(0, 100)}…`

  return {
    reply_to_id: parent.id as string,
    reply_preview: preview,
    reply_from: from,
    quoted_line_message_id: quoted,
  }
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
      if (!msg?.type) continue

      const summarized = summarizeLineInboundMessage(msg)
      if (!summarized) continue

      let leadId = await findLeadIdForLineUser(admin, lineUserId)
      if (!leadId) {
        console.warn('line-webhook: no lead for', lineUserId)
        continue
      }

      const { data: leadRow, error: leadReadErr } = await admin
        .from('leads')
        .select('line_user_id, line_oa_chat_user_id')
        .eq('id', leadId)
        .maybeSingle()

      if (leadReadErr) {
        console.error('line-webhook lead read for oa sync', leadReadErr)
      } else {
        const existingOa = (leadRow?.line_oa_chat_user_id as string | null)?.trim() ?? ''
        const existingLogin = (leadRow?.line_user_id as string | null)?.trim() ?? ''
        const shouldSyncOa =
          !existingOa ||
          existingOa.toLowerCase() === lineUserId.toLowerCase() ||
          (Boolean(existingLogin) &&
            existingOa.toLowerCase() === existingLogin.toLowerCase() &&
            lineUserId.toLowerCase() !== existingLogin.toLowerCase())

        if (shouldSyncOa) {
          const { error: syncErr } = await admin
            .from('leads')
            .update({ line_oa_chat_user_id: lineUserId })
            .eq('id', leadId)
          if (syncErr) {
            console.error('line-webhook sync line_oa_chat_user_id', syncErr)
          }
        } else if (existingOa && existingOa.toLowerCase() !== lineUserId.toLowerCase()) {
          console.info(
            'line-webhook: keep manual line_oa_chat_user_id',
            leadId,
            'oa=',
            existingOa.slice(0, 10),
            'incoming=',
            lineUserId.slice(0, 10),
          )
        }
      }

      const replyMeta = await buildInboundReplyMetadata(admin, leadId, msg.quotedMessageId)
      const quoteToken = msg.quoteToken?.trim()

      const row: Record<string, unknown> = {
        lead_id: leadId,
        line_user_id: lineUserId,
        direction: 'inbound',
        body: summarized.body,
        message_type: summarized.message_type,
        metadata: {
          ...summarized.metadata,
          ...replyMeta,
          ...(quoteToken ? { quote_token: quoteToken } : {}),
        },
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
