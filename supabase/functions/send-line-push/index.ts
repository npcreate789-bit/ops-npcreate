import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { formatLineMessagingApiError } from './lineApiErrors.ts'

const PRIVILEGED = new Set(['ceo', 'operations', 'dev', 'admin', 'account', 'sales'])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushBody {
  to?: string
  text?: string
  image_url?: string
  lead_id?: string
  reply_to_message_id?: string
  metadata?: Record<string, unknown>
  storage_path?: string
  image_name?: string
}

interface LineSentMessage {
  id?: string
  quoteToken?: string
}

async function loadParentQuoteToken(
  admin: ReturnType<typeof createClient>,
  replyToMessageId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('lead_line_messages')
    .select('metadata')
    .eq('id', replyToMessageId)
    .maybeSingle()

  if (error) {
    console.warn('send-line-push quote_token lookup', replyToMessageId, error.message)
    return null
  }

  const meta = data?.metadata as Record<string, unknown> | null
  const token = meta?.quote_token
  return typeof token === 'string' && token.trim() ? token.trim() : null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const lineToken = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
    if (!lineToken) {
      return json({ error: 'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN not configured' }, 503)
    }

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
      console.error('send-line-push rolesReadErr', rolesReadErr)
      return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
    }

    const roles = (callerRoles ?? []).map((r) => r.role as string)
    if (!roles.some((r) => PRIVILEGED.has(r))) {
      return json({ error: 'ไม่มีสิทธิ์ส่งข้อความ LINE' }, 403)
    }

    const body = (await req.json()) as PushBody
    const to = body.to?.trim() ?? ''
    const text = body.text?.trim() ?? ''
    const imageUrl = body.image_url?.trim() ?? ''
    const metadata =
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : {}
    const storagePath = body.storage_path?.trim() ?? ''
    const imageName = body.image_name?.trim() ?? ''

    if (!to || to.length > 64) {
      return json({ error: 'LINE User ID ไม่ถูกต้อง' }, 400)
    }

    if (!text && !imageUrl) {
      return json({ error: 'ต้องมีข้อความหรือรูปภาพ' }, 400)
    }

    if (text.length > 5000) {
      return json({ error: 'ข้อความยาวเกินไป' }, 400)
    }

    if (imageUrl && (!isHttpsUrl(imageUrl) || imageUrl.length > 2000)) {
      return json({ error: 'ลิงก์รูปไม่ถูกต้อง' }, 400)
    }

    const profileRes = await fetch(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(to)}`,
      { headers: { Authorization: `Bearer ${lineToken}` } },
    )
    if (!profileRes.ok) {
      const errText = await profileRes.text()
      console.error('LINE profile check failed', profileRes.status, to, errText)
      return json(
        {
          error: formatLineMessagingApiError(profileRes.status, errText, 'profile'),
          to,
        },
        profileRes.status === 404 ? 400 : 502,
      )
    }

    const replyToMessageId =
      body.reply_to_message_id?.trim() ??
      (typeof metadata.reply_to_id === 'string' ? metadata.reply_to_id.trim() : '')

    let quoteToken: string | null = null
    if (replyToMessageId) {
      quoteToken = await loadParentQuoteToken(admin, replyToMessageId)
      if (!quoteToken) {
        console.warn(
          'send-line-push: no quote_token on parent message',
          replyToMessageId,
          '(ข้อความเก่าก่อนอัปเดตระบบ — ให้ลูกค้าทักใหม่หรือส่งข้อความใหม่จาก CRM)',
        )
      }
    }

    const lineMessages: Record<string, string>[] = []
    if (imageUrl) {
      lineMessages.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      })
    }
    if (text) {
      const textMsg: Record<string, string> = { type: 'text', text }
      if (quoteToken) textMsg.quoteToken = quoteToken
      lineMessages.push(textMsg)
    }

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({ to, messages: lineMessages }),
    })

    const pushRaw = await lineRes.text()
    let pushJson: { sentMessages?: LineSentMessage[] } = {}
    try {
      pushJson = pushRaw ? (JSON.parse(pushRaw) as { sentMessages?: LineSentMessage[] }) : {}
    } catch {
      pushJson = {}
    }

    if (!lineRes.ok) {
      console.error('LINE push failed', lineRes.status, to, pushRaw)
      return json(
        {
          error: formatLineMessagingApiError(lineRes.status, pushRaw, 'push'),
          to,
        },
        502,
      )
    }

    const leadId = body.lead_id?.trim()
    if (leadId) {
      const logRows: Record<string, unknown>[] = []

      if (imageUrl) {
        const imageMeta: Record<string, unknown> = { ...metadata }
        if (storagePath) imageMeta.storage_path = storagePath
        logRows.push({
          lead_id: leadId,
          line_user_id: to,
          direction: 'outbound',
          body: imageName || '[รูปภาพ]',
          message_type: 'image',
          metadata: imageMeta,
          sender_profile_id: caller.id,
        })
      }

      if (text) {
        logRows.push({
          lead_id: leadId,
          line_user_id: to,
          direction: 'outbound',
          body: text,
          message_type: 'text',
          metadata: { ...metadata },
          sender_profile_id: caller.id,
        })
      }

      const sent = pushJson.sentMessages ?? []

      for (let i = 0; i < logRows.length; i++) {
        const row = logRows[i]
        const sentItem = sent[i]
        if (sentItem?.id) row.line_message_id = String(sentItem.id).trim()
        const rowMeta = row.metadata as Record<string, unknown>
        if (sentItem?.quoteToken?.trim()) {
          rowMeta.quote_token = sentItem.quoteToken.trim()
        }
        const { error: logErr } = await admin.from('lead_line_messages').insert(row)
        if (logErr) {
          console.error('send-line-push log message', logErr)
        }
      }
    }

    await admin.from('audit_logs').insert({
      actor_id: caller.id,
      action: 'line.push',
      entity_type: 'line_user',
      entity_id: to,
      metadata: {
        char_count: text.length,
        has_image: Boolean(imageUrl),
      },
    })

    return json({ ok: true, mode: 'push' })
  } catch (e) {
    console.error('send-line-push', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
