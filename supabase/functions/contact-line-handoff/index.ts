/**
 * หลัง submit /contact —
 * 1) push ข้อความถึงลูกค้าในแชท OA (chat.line.biz) — ใช้ line_oa_chat_user_id ก่อน LINE Login id
 * 2) แจ้งทีม OA (Notify / staff / สรุปในแชท)
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
  brand_name: string | null
  contact_name: string | null
  phone: string | null
  line_user_id: string | null
  line_oa_chat_user_id: string | null
  services_interested: string[] | null
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
  return `${base}/app/crm/leads/${leadId}`
}

function parseLineUserIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,\s;]+/)
    .map((id) => id.trim())
    .filter((id) => LINE_MESSAGING_USER_ID_RE.test(id))
}

/** ลำดับ push: OA chat id จาก CRM → id จากฟอร์ม → LINE Login ใน lead */
function resolvePushTargets(lead: LeadRow, requestLineUserId: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (id?: string | null) => {
    const t = id?.trim()
    if (!t || !LINE_MESSAGING_USER_ID_RE.test(t)) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }
  add(lead.line_oa_chat_user_id)
  add(requestLineUserId)
  add(lead.line_user_id)
  return out
}

function buildOaStaffNotifyMessage(input: {
  lead: LeadRow
  customerText: string
  pushUserId?: string
}): string {
  const services = (input.lead.services_interested ?? []).filter(Boolean)
  const lines = [
    `[Lead ใหม่ — /contact]`,
    `แบรนด์: ${input.lead.brand_name?.trim() || '—'}`,
    `ชื่อ: ${input.lead.contact_name?.trim() || '—'}`,
    `โทร: ${input.lead.phone?.trim() || '—'}`,
    `LINE Login: ${input.lead.line_user_id?.trim() || '—'}`,
  ]
  if (input.lead.line_oa_chat_user_id?.trim()) {
    lines.push(`แชท OA: ${input.lead.line_oa_chat_user_id.trim()}`)
  }
  if (input.pushUserId) {
    lines.push(`ส่ง push ไปที่: ${input.pushUserId}`)
  }
  if (services.length > 0) {
    lines.push(`บริการ: ${services.join(', ')}`)
  }
  lines.push('', '--- ข้อความลูกค้า ---', input.customerText.trim(), '', `CRM: ${appLeadUrl(input.lead.id)}`)
  return lines.join('\n')
}

async function botProfileExists(token: string, userId: string): Promise<boolean> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) return true
  if (res.status !== 404) {
    console.warn('contact-line-handoff bot profile', userId, res.status, await res.text())
  }
  return false
}

async function pushLineText(
  token: string,
  to: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
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

  if (lineRes.ok) return { ok: true }

  const errBody = await lineRes.text()
  console.error('contact-line-handoff push failed', lineRes.status, to, errBody)

  if (lineRes.status === 403 || errBody.includes('not a friend')) {
    return { ok: false, reason: 'not_friend' }
  }

  return { ok: false, reason: 'push_failed' }
}

async function pushLineTextWithRetry(
  token: string,
  to: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
  let result = await pushLineText(token, to, text)
  if (!result.ok) {
    await new Promise((r) => setTimeout(r, 400))
    result = await pushLineText(token, to, text)
  }
  return result
}

type PushAttempt = { ok: boolean; to?: string; reason?: string }

/** Push ไปยัง user id ที่ Messaging API รู้จัก (ปรากฏใน chat.line.biz) */
async function pushLineTextToTargets(
  token: string,
  targets: string[],
  text: string,
): Promise<PushAttempt> {
  if (targets.length === 0) {
    return { ok: false, reason: 'invalid_line_user_id' }
  }

  const profileChecks = await Promise.all(
    targets.map(async (id) => ({ id, ok: await botProfileExists(token, id) })),
  )
  const known = profileChecks.filter((p) => p.ok).map((p) => p.id)
  const tryOrder = known.length > 0 ? known : targets

  for (const to of tryOrder) {
    const result = await pushLineTextWithRetry(token, to, text)
    if (result.ok) return { ok: true, to }
  }

  const last = await pushLineTextWithRetry(token, targets[0], text)
  return { ok: last.ok, to: last.ok ? targets[0] : undefined, reason: last.reason }
}

async function lineNotify(token: string, message: string): Promise<boolean> {
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams({ message }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('contact-line-handoff LINE Notify failed', res.status, body)
  }
  return res.ok
}

async function notifyLineOaStaffViaIds(oaToken: string, staffText: string): Promise<boolean> {
  const staffIds = parseLineUserIds(Deno.env.get('LINE_OA_NOTIFY_USER_IDS'))
  if (staffIds.length === 0) return false

  let anyOk = false
  for (const staffId of staffIds) {
    const result = await pushLineTextWithRetry(oaToken, staffId, staffText)
    if (result.ok) anyOk = true
  }
  return anyOk
}

async function deliverLineOaBundle(input: {
  token: string
  targets: string[]
  staffText: string
}): Promise<boolean> {
  const notifyToken = Deno.env.get('LINE_NOTIFY_TOKEN')?.trim()
  if (notifyToken && (await lineNotify(notifyToken, input.staffText))) {
    return true
  }

  const oaToken = Deno.env.get('LINE_OA_CHANNEL_ACCESS_TOKEN')?.trim()
  if (oaToken && (await notifyLineOaStaffViaIds(oaToken, input.staffText))) {
    return true
  }

  const inbox = await pushLineTextToTargets(input.token, input.targets, input.staffText)
  if (inbox.ok) return true

  if (oaToken && oaToken !== input.token) {
    const alt = await pushLineTextToTargets(oaToken, input.targets, input.staffText)
    return alt.ok
  }

  return false
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
        oa_notified: false,
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
      .select(
        'id, brand_name, contact_name, phone, line_user_id, line_oa_chat_user_id, services_interested, channel, created_at',
      )
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

    const pushTargets = resolvePushTargets(leadRow, lineUserId)
    const chatUrl = lineOaMessageUrl(text)

    const messagingToken = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
    const oaToken = Deno.env.get('LINE_OA_CHANNEL_ACCESS_TOKEN')?.trim()
    const customerToken = messagingToken || oaToken

    if (!customerToken) {
      return json({
        ok: true,
        mode: 'open_chat',
        url: chatUrl,
        reason: 'no_messaging_token',
        oa_notified: false,
      })
    }

    const customerPush = await pushLineTextToTargets(customerToken, pushTargets, text)

    let pushUserId = customerPush.to
    let staffText = buildOaStaffNotifyMessage({
      lead: leadRow,
      customerText: text,
      pushUserId,
    })

    let oaNotified = false
    try {
      oaNotified = await deliverLineOaBundle({
        token: customerToken,
        targets: pushTargets,
        staffText,
      })
    } catch (e) {
      console.error('contact-line-handoff oa bundle', e)
    }

    if (oaToken && messagingToken && oaToken !== messagingToken) {
      const oaExtra = await pushLineTextToTargets(oaToken, pushTargets, text)
      if (oaExtra.ok) {
        oaNotified = true
        if (!pushUserId) pushUserId = oaExtra.to
      }
    }

    if (customerPush.ok && pushUserId) {
      const oaId = leadRow.line_oa_chat_user_id?.trim()
      if (!oaId || oaId.toLowerCase() !== pushUserId.toLowerCase()) {
        await admin
          .from('leads')
          .update({ line_oa_chat_user_id: pushUserId })
          .eq('id', leadId)
      }
    }

    if (customerPush.ok) {
      return json({
        ok: true,
        mode: 'push',
        url: chatUrl,
        oa_notified: oaNotified,
        push_user_id: pushUserId,
      })
    }

    const loginKnown = await botProfileExists(customerToken, lineUserId)
    const reason = loginKnown
      ? (customerPush.reason ?? 'push_failed')
      : 'oa_chat_id_mismatch'

    return json({
      ok: true,
      mode: 'open_chat',
      url: chatUrl,
      reason,
      oa_notified: oaNotified,
      push_user_id: pushUserId,
      line_login_id: lineUserId,
      line_oa_chat_user_id: leadRow.line_oa_chat_user_id,
    })
  } catch (e) {
    console.error('contact-line-handoff', e)
    return json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, 500)
  }
})
