/**
 * หลัง submit /contact — ส่งข้อความเข้าแชท LINE ของลูกค้า (push) หรือคืน URL เปิดแชท
 * Secrets: LINE_MESSAGING_CHANNEL_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LINE_MESSAGING_USER_ID_RE = /^U[0-9a-f]{32}$/i
const HANDOFF_MAX_AGE_MS = 10 * 60 * 1000

interface HandoffBody {
  lead_id?: string
  line_user_id?: string
  text?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function lineOaHandle(): string {
  const raw = Deno.env.get('LINE_OA_ID')?.trim() || '@npcreate'
  return raw.startsWith('@') ? raw : `@${raw}`
}

function lineOaMessageUrl(message: string): string {
  const base = `https://line.me/R/oaMessage/${lineOaHandle()}/`
  return `${base}?${encodeURIComponent(message.trim())}`
}

async function pushLineText(token: string, to: string, text: string): Promise<boolean> {
  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  })
  if (!lineRes.ok) {
    console.error('contact-line-handoff push failed', lineRes.status, await lineRes.text())
    return false
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as HandoffBody
    const leadId = body.lead_id?.trim() ?? ''
    const lineUserId = body.line_user_id?.trim() ?? ''
    const text = body.text?.trim() ?? ''

    if (!leadId || !lineUserId || !text) {
      return json({ error: 'ข้อมูลไม่ครบ' }, 400)
    }

    if (!LINE_MESSAGING_USER_ID_RE.test(lineUserId)) {
      return json({
        ok: true,
        mode: 'open_chat',
        url: lineOaMessageUrl(text),
        reason: 'invalid_line_user_id',
      })
    }

    if (text.length > 5000) {
      return json({ error: 'ข้อความยาวเกินไป' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: lead, error: leadErr } = await admin
      .from('leads')
      .select('id, line_user_id, channel, created_at')
      .eq('id', leadId)
      .maybeSingle()

    if (leadErr || !lead) {
      return json({ error: 'ไม่พบ Lead' }, 404)
    }

    if (lead.channel !== 'website' || lead.line_user_id !== lineUserId) {
      return json({ error: 'ไม่ได้รับอนุญาต' }, 403)
    }

    const createdAt = new Date(lead.created_at).getTime()
    if (Number.isNaN(createdAt) || Date.now() - createdAt > HANDOFF_MAX_AGE_MS) {
      return json({ error: 'หมดเวลาส่งข้อความ LINE' }, 403)
    }

    const chatUrl = lineOaMessageUrl(text)
    const lineToken = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()

    if (!lineToken) {
      return json({ ok: true, mode: 'open_chat', url: chatUrl, reason: 'no_messaging_token' })
    }

    const pushed = await pushLineText(lineToken, lineUserId, text)
    if (pushed) {
      return json({ ok: true, mode: 'push', url: chatUrl })
    }

    return json({
      ok: true,
      mode: 'open_chat',
      url: chatUrl,
      reason: 'push_failed',
    })
  } catch (e) {
    console.error('contact-line-handoff', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
