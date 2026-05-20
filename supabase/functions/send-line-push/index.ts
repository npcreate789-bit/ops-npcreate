import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { formatLineMessagingApiError } from './lineApiErrors.ts'
import { collectLeadLinePushCandidates } from './pushRecipientFallback.ts'

const PRIVILEGED = new Set(['ceo', 'operations', 'dev', 'admin', 'account', 'sales'])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushBody {
  to?: string
  text?: string
  image_url?: string
  sticker_package_id?: string
  sticker_id?: string
  lead_id?: string
  reply_to_message_id?: string
  metadata?: Record<string, unknown>
  storage_path?: string
  image_name?: string
  /** LINE Flex Message — ใบเสนอราคา / การ์ดปุ่ม */
  flex_alt_text?: string
  flex_contents?: Record<string, unknown>
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
    const stickerPackageId = body.sticker_package_id?.trim() ?? ''
    const stickerId = body.sticker_id?.trim() ?? ''
    const hasSticker = Boolean(stickerPackageId && stickerId)
    const flexAlt = body.flex_alt_text?.trim() ?? ''
    const flexContents =
      body.flex_contents && typeof body.flex_contents === 'object' &&
        !Array.isArray(body.flex_contents)
        ? body.flex_contents
        : null
    const hasFlex = Boolean(flexAlt && flexContents)

    if (!to || to.length > 64) {
      return json({ error: 'LINE User ID ไม่ถูกต้อง' }, 400)
    }

    if (!text && !imageUrl && !hasSticker && !hasFlex) {
      return json({ error: 'ต้องมีข้อความ รูปภาพ สติกเกอร์ หรือ Flex' }, 400)
    }

    if (flexAlt.length > 400) {
      return json({ error: 'Flex alt text ยาวเกินไป' }, 400)
    }

    if (text.length > 5000) {
      return json({ error: 'ข้อความยาวเกินไป' }, 400)
    }

    if (imageUrl && (!isHttpsUrl(imageUrl) || imageUrl.length > 2000)) {
      return json({ error: 'ลิงก์รูปไม่ถูกต้อง' }, 400)
    }

    const leadId = body.lead_id?.trim()

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

    const lineMessages: Record<string, unknown>[] = []
    if (imageUrl) {
      lineMessages.push({
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      })
    }
    if (hasSticker) {
      const stickerMsg: Record<string, unknown> = {
        type: 'sticker',
        packageId: stickerPackageId,
        stickerId,
      }
      if (quoteToken && !text && !imageUrl && !hasFlex) stickerMsg.quoteToken = quoteToken
      lineMessages.push(stickerMsg)
    }
    if (text) {
      const textMsg: Record<string, unknown> = { type: 'text', text }
      if (quoteToken && !hasFlex) textMsg.quoteToken = quoteToken
      lineMessages.push(textMsg)
    }
    if (hasFlex) {
      const flexMsg: Record<string, unknown> = {
        type: 'flex',
        altText: flexAlt,
        contents: flexContents,
      }
      if (quoteToken) flexMsg.quoteToken = quoteToken
      lineMessages.push(flexMsg)
    }

    let pushTo = to

    async function postLinePush(target: string): Promise<Response> {
      return fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineToken}`,
        },
        body: JSON.stringify({ to: target, messages: lineMessages }),
      })
    }

    let lineRes = await postLinePush(pushTo)

    if (!lineRes.ok && leadId) {
      const candidates = await collectLeadLinePushCandidates(admin, leadId, pushTo)
      for (const alt of candidates) {
        const altRes = await postLinePush(alt)
        if (altRes.ok) {
          pushTo = alt
          lineRes = altRes
          console.info('send-line-push: push fallback', to, '->', pushTo)
          break
        }
      }
    }

    const pushRaw = await lineRes.text()
    let pushJson: { sentMessages?: LineSentMessage[] } = {}
    try {
      pushJson = pushRaw ? (JSON.parse(pushRaw) as { sentMessages?: LineSentMessage[] }) : {}
    } catch {
      pushJson = {}
    }

    if (!lineRes.ok) {
      console.error('LINE push failed', lineRes.status, pushTo, pushRaw)
      return json(
        {
          error: formatLineMessagingApiError(lineRes.status, pushRaw, 'push', pushTo),
          to: pushTo,
        },
        lineRes.status === 400 || lineRes.status === 404 ? 400 : 502,
      )
    }

    if (leadId) {
      const { data: leadRow } = await admin
        .from('leads')
        .select('line_oa_chat_user_id')
        .eq('id', leadId)
        .maybeSingle()
      const existingOa = (leadRow?.line_oa_chat_user_id as string | null)?.trim() ?? ''
      if (existingOa.toLowerCase() !== pushTo.toLowerCase()) {
        const { error: syncErr } = await admin
          .from('leads')
          .update({ line_oa_chat_user_id: pushTo })
          .eq('id', leadId)
        if (syncErr) {
          console.warn('send-line-push sync line_oa_chat_user_id', leadId, syncErr.message)
        } else if (pushTo !== to) {
          console.info('send-line-push synced line_oa_chat_user_id', leadId, pushTo.slice(0, 10))
        }
      }
    }

    if (leadId) {
      const logRows: Record<string, unknown>[] = []

      if (imageUrl) {
        const imageMeta: Record<string, unknown> = { ...metadata }
        if (storagePath) imageMeta.storage_path = storagePath
        logRows.push({
          lead_id: leadId,
          line_user_id: pushTo,
          direction: 'outbound',
          body: imageName || '[รูปภาพ]',
          message_type: 'image',
          metadata: imageMeta,
          sender_profile_id: caller.id,
        })
      }

      if (hasSticker) {
        const stickerMeta: Record<string, unknown> = {
          ...metadata,
          packageId: stickerPackageId,
          stickerId,
        }
        logRows.push({
          lead_id: leadId,
          line_user_id: pushTo,
          direction: 'outbound',
          body: '[สติกเกอร์]',
          message_type: 'sticker',
          metadata: stickerMeta,
          sender_profile_id: caller.id,
        })
      }

      if (text) {
        logRows.push({
          lead_id: leadId,
          line_user_id: pushTo,
          direction: 'outbound',
          body: text,
          message_type: 'text',
          metadata: { ...metadata },
          sender_profile_id: caller.id,
        })
      }

      if (hasFlex) {
        logRows.push({
          lead_id: leadId,
          line_user_id: pushTo,
          direction: 'outbound',
          body: flexAlt,
          message_type: 'flex',
          metadata: { ...metadata, flex: true },
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
      entity_id: pushTo,
      metadata: {
        char_count: text.length,
        has_image: Boolean(imageUrl),
        has_sticker: hasSticker,
        has_flex: hasFlex,
      },
    })

    return json({ ok: true, mode: 'push' })
  } catch (e) {
    console.error('send-line-push', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
