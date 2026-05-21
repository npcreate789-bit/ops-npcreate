import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { buildLinePushCandidateIds } from './linePushRecipient.ts'
import {
  buildPaymentLineMessage,
  publicQuotationUrl,
  type PaymentLineEvent,
} from './paymentLineMessages.ts'

interface LineNotifySettings {
  line_notify_slip_received: boolean
  line_notify_payment_confirmed: boolean
  line_notify_slip_rejected: boolean
  line_notify_review_pending: boolean
}

function eventEnabled(settings: LineNotifySettings, event: PaymentLineEvent): boolean {
  switch (event) {
    case 'slip_received':
      return settings.line_notify_slip_received
    case 'payment_confirmed':
      return settings.line_notify_payment_confirmed
    case 'slip_rejected':
      return settings.line_notify_slip_rejected
    case 'review_pending':
      return settings.line_notify_review_pending
  }
}

async function loadSettings(admin: SupabaseClient): Promise<LineNotifySettings> {
  const { data, error } = await admin.rpc('get_company_payment_settings')
  if (error || !data || typeof data !== 'object') {
    return {
      line_notify_slip_received: true,
      line_notify_payment_confirmed: true,
      line_notify_slip_rejected: true,
      line_notify_review_pending: true,
    }
  }
  const r = data as Record<string, unknown>
  return {
    line_notify_slip_received: r.line_notify_slip_received !== false,
    line_notify_payment_confirmed: r.line_notify_payment_confirmed !== false,
    line_notify_slip_rejected: r.line_notify_slip_rejected !== false,
    line_notify_review_pending: r.line_notify_review_pending !== false,
  }
}

async function linePushText(to: string, text: string): Promise<boolean> {
  const token = Deno.env.get('LINE_MESSAGING_CHANNEL_ACCESS_TOKEN')?.trim()
  if (!token) return false

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.warn('payment LINE push failed', to.slice(0, 8), res.status, err.slice(0, 200))
    return false
  }
  return true
}

export async function notifyPaymentCustomerLine(
  admin: SupabaseClient,
  paymentId: string,
  event: PaymentLineEvent,
  opts?: { rejectNote?: string | null },
): Promise<{ ok: boolean; skipped?: string; pushed?: boolean }> {
  const settings = await loadSettings(admin)
  if (!eventEnabled(settings, event)) {
    return { ok: true, skipped: 'disabled_in_settings' }
  }

  const { data: payment, error: payErr } = await admin
    .from('payments')
    .select(
      'id, total_amount, quotation_id, customer_id, verification_status, customer_slip_uploaded_at',
    )
    .eq('id', paymentId)
    .maybeSingle()

  if (payErr || !payment) {
    return { ok: false, skipped: 'payment_not_found' }
  }

  if (event === 'slip_received' && payment.verification_status !== 'verifying') {
    return { ok: true, skipped: 'not_verifying' }
  }

  let quotationNumber: string | null = null
  let publicToken: string | null = null
  let leadId: string | null = null
  let lineUserId: string | null = null
  let lineOaChatUserId: string | null = null
  let brandName = 'ลูกค้า'
  let total = Number(payment.total_amount) || 0

  if (payment.quotation_id) {
    const { data: q } = await admin
      .from('quotations')
      .select('quotation_number, public_token, total, lead_id')
      .eq('id', payment.quotation_id)
      .maybeSingle()

    if (q) {
      quotationNumber = q.quotation_number ?? null
      publicToken = q.public_token ?? null
      total = Number(q.total) || total
      leadId = q.lead_id ?? null
    }
  }

  if (leadId) {
    const { data: l } = await admin
      .from('leads')
      .select('brand_name, line_user_id, line_oa_chat_user_id')
      .eq('id', leadId)
      .maybeSingle()
    if (l) {
      brandName = l.brand_name?.trim() || brandName
      lineUserId = l.line_user_id ?? null
      lineOaChatUserId = l.line_oa_chat_user_id ?? null
    }

  } else if (payment.customer_id) {

    const { data: c } = await admin
      .from('customers')
      .select('brand_name, lead_id')
      .eq('id', payment.customer_id)
      .maybeSingle()
    if (c) {
      brandName = c.brand_name?.trim() || brandName
      if (c.lead_id) {
        leadId = c.lead_id
        const { data: l } = await admin
          .from('leads')
          .select('brand_name, line_user_id, line_oa_chat_user_id')
          .eq('id', c.lead_id)
          .maybeSingle()
        if (l) {
          brandName = l.brand_name?.trim() || brandName
          lineUserId = l.line_user_id ?? null
          lineOaChatUserId = l.line_oa_chat_user_id ?? null
        }
      }
    }
  }

  if (
    (event === 'review_pending' ||
      event === 'payment_confirmed' ||
      event === 'slip_received') &&
    leadId
  ) {
    const source = `payment_line_${event}`
    let query = admin
      .from('lead_line_messages')
      .select('id, created_at')
      .eq('lead_id', leadId)
      .eq('direction', 'outbound')
      .contains('metadata', {
        payment_id: paymentId,
        source,
      })
      .limit(1)

    // slip_received: dedupe ตาม slip upload ปัจจุบัน — ถ้า reject แล้ว upload ใหม่ต้องส่งได้อีก
    if (event === 'slip_received' && payment.customer_slip_uploaded_at) {
      query = query.gte('created_at', payment.customer_slip_uploaded_at)
    }

    const { data: prior } = await query

    if (prior?.length) {
      return {
        ok: true,
        skipped: `${event}_already_sent`,
      }
    }
  }

  const candidates = buildLinePushCandidateIds({
    lineUserId,
    lineOaChatUserId,
  })

  if (candidates.length === 0) {
    return { ok: true, skipped: 'no_line_recipient' }
  }

  const text = buildPaymentLineMessage(event, {
    brandName,
    quotationNumber,
    total,
    publicUrl: publicQuotationUrl(publicToken),
    rejectNote: opts?.rejectNote,
  })

  for (const to of candidates) {
    const pushed = await linePushText(to, text)
    if (pushed) {
      if (leadId) {
        await admin.from('lead_line_messages').insert({
          lead_id: leadId,
          direction: 'outbound',
          body: text,
          metadata: {
            payment_id: paymentId,
            source: `payment_line_${event}`,
          },
        })
      }
      return { ok: true, pushed: true }
    }
  }

  return { ok: true, skipped: 'push_failed' }
}
