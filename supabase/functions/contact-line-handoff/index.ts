/**
 * หลัง submit /contact — คืน URL เปิด LINE (oaMessage) เท่านั้น
 * Messaging API push ปิดใช้งาน — ลูกค้ากดส่งข้อความในแอปเอง
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

interface LeadRow {
  id: string
  line_user_id: string | null
  channel: string
  created_at: string
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

function appLeadUrl(leadId: string): string {
  const origin = Deno.env.get('CONTACT_OAUTH_RETURN_ORIGIN')?.trim() ||
    Deno.env.get('VITE_APP_URL')?.trim() ||
    'https://app.npcreate.co.th'
  const base = origin.replace(/\/$/, '')
  return `${base}/app/crm/${leadId}`
}

/** ข้อความในช่องพิมพ์ oaMessage */
function buildOaPrefillMessage(leadId: string, customerText: string): string {
  return ['--- ข้อความลูกค้า ---', customerText.trim(), `CRM:  ${appLeadUrl(leadId)}`].join('\n')
}

function openChatResponse(leadId: string, customerText: string, reason?: string) {
  const oaPrefill = buildOaPrefillMessage(leadId, customerText)
  return json({
    ok: true,
    mode: 'open_chat',
    url: lineOaMessageUrl(oaPrefill),
    reason: reason ?? 'messaging_api_disabled',
    oa_notified: false,
  })
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
      return openChatResponse(leadId, text, 'invalid_line_user_id')
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

    const leadRow = lead as LeadRow
    const leadLineId = (leadRow.line_user_id ?? '').trim()
    if (leadRow.channel !== 'website' || leadLineId.toLowerCase() !== lineUserId.toLowerCase()) {
      return json({ error: 'ไม่ได้รับอนุญาต' }, 403)
    }

    const createdAt = new Date(leadRow.created_at).getTime()
    if (Number.isNaN(createdAt) || Date.now() - createdAt > HANDOFF_MAX_AGE_MS) {
      return json({ error: 'หมดเวลาส่งข้อความ LINE' }, 403)
    }

    return openChatResponse(leadId, text)
  } catch (e) {
    console.error('contact-line-handoff', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
