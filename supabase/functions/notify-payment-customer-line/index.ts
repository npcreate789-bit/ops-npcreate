import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { authorizePaymentLineNotify } from '../_shared/paymentEdgeAuth.ts'
import { notifyPaymentCustomerLine } from '../_shared/paymentCustomerLineNotify.ts'
import type { PaymentLineEvent } from '../_shared/paymentLineMessages.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-payment-edge-secret',
}

const ALLOWED: PaymentLineEvent[] = [
  'slip_received',
  'review_pending',
  'payment_confirmed',
  'slip_rejected',
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Server misconfigured' }, 500)
    }

    const body = (await req.json()) as {
      payment_id?: string
      public_token?: string
      event?: PaymentLineEvent
      reject_note?: string | null
    }

    const paymentId = body.payment_id?.trim()
    const event = body.event
    if (!paymentId || !event || !ALLOWED.includes(event)) {
      return json({ error: 'payment_id and valid event required' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const authz = await authorizePaymentLineNotify(req, admin, paymentId, event, {
      publicToken: body.public_token,
    })
    if (!authz.ok) {
      return json({ error: authz.error }, authz.status)
    }

    const result = await notifyPaymentCustomerLine(admin, paymentId, event, {
      rejectNote: body.reject_note,
    })

    return json({ ok: true, ...result })
  } catch (e) {
    console.error('notify-payment-customer-line', e)
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
  }
})
