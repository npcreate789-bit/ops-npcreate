/**
 * หลัง submit /contact
 * - confirmation_only: push ข้อความยืนยันจาก OA (ไม่แทนการให้ลูกค้าส่งรายละเอียดเข้า inbox)
 * รายละเอียดจากฟอร์มต้องให้ลูกค้ากดส่งผ่าน oaMessage URL ฝั่ง client
 *
 * Secrets: LINE_MESSAGING_CHANNEL_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LINE_MESSAGING_USER_ID_RE = /^U[0-9a-f]{32}$/i
const HANDOFF_MAX_AGE_MS = 10 * 60 * 1000

const CONFIRMATION_TEXT =
  'ขอบคุณที่สนใจบริการ NP Create\n\nเราได้รับข้อมูลจากฟอร์มแล้ว ทีมจะติดต่อกลับทางแชทนี้เร็วๆ นะครับ\n\n(กรุณาส่งข้อความรายละเอียดในแชทนี้ด้วย หากระบบเปิดให้กรอกไว้แล้ว กดส่งได้เลย)'

interface HandoffBody {
  lead_id?: string
  line_user_id?: string
  text?: string
  mode?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

async function verifyLead(
  admin: ReturnType<typeof createClient>,
  leadId: string,
  lineUserId: string,
) {
  const { data: lead, error: leadErr } = await admin
    .from('leads')
    .select('id, line_user_id, channel, created_at')
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !lead) {
    return { error: json({ error: 'ไม่พบ Lead' }, 404) }
  }

  if (lead.channel !== 'website' || lead.line_user_id !== lineUserId) {
    return { error: json({ error: 'ไม่ได้รับอนุญาต' }, 403) }
  }

  const createdAt = new Date(lead.created_at).getTime()
  if (Number.isNaN(createdAt) || Date.now() - createdAt > HANDOFF_MAX_AGE_MS) {
    return { error: json({ error: 'หมดเวลาส่งข้อความ LINE' }, 403) }
  }

  return { lead }
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
    const mode = body.mode?.trim() ?? 'confirmation_only'

    if (!leadId || !lineUserId) {
      return json({ error: 'ข้อมูลไม่ครบ' }, 400)
    }

    if (!LINE_MESSAGING_USER_ID_RE.test(lineUserId)) {
      return json({ ok: true, pushed: false, reason: 'invalid_line_user_id' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const verified = await verifyLead(admin, leadId, lineUserId)
    if ('error' in verified && verified.error) {
      return verified.error
    }

    const lineToken = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
    if (!lineToken) {
      return json({ ok: true, pushed: false, reason: 'no_messaging_token' })
    }

    if (mode === 'confirmation_only') {
      const pushed = await pushLineText(lineToken, lineUserId, CONFIRMATION_TEXT)
      return json({
        ok: true,
        pushed,
        reason: pushed ? 'confirmation_pushed' : 'push_failed',
      })
    }

    return json({ ok: true, pushed: false, reason: 'unknown_mode' })
  } catch (e) {
    console.error('contact-line-handoff', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
