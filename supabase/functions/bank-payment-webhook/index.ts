import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { notifyPaymentCustomerLine } from '../_shared/paymentCustomerLineNotify.ts'
import { constantTimeEqual } from '../_shared/paymentEdgeAuth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-bank-webhook-secret, x-bank-webhook-signature, x-bank-webhook-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function bytesToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return bytesToHex(sig)
}

/** อนุญาต 2 mode:
 *  1) HMAC: header `x-bank-webhook-timestamp` + `x-bank-webhook-signature` (hex sha256 ของ `${ts}.${raw_body}`)
 *  2) Legacy: header `x-bank-webhook-secret` (รองรับช่วง migration; warn ใน log)
 */
async function verifyWebhook(
  req: Request,
  rawBody: string,
  secret: string,
): Promise<{ ok: true; mode: 'hmac' | 'shared' } | { ok: false; error: string; status: number }> {
  const ts = req.headers.get('x-bank-webhook-timestamp')?.trim()
  const sig = req.headers.get('x-bank-webhook-signature')?.trim()

  if (ts && sig) {
    const tsNum = Number(ts)
    if (!Number.isFinite(tsNum)) {
      return { ok: false, error: 'invalid_timestamp', status: 401 }
    }
    const skewSec = Math.abs(Date.now() / 1000 - tsNum)
    const maxSkew = Number(Deno.env.get('BANK_WEBHOOK_MAX_SKEW_SEC')?.trim() || '300')
    if (skewSec > maxSkew) {
      return { ok: false, error: 'timestamp_out_of_window', status: 401 }
    }
    const expected = await hmacSha256Hex(secret, `${ts}.${rawBody}`)
    if (!constantTimeEqual(sig.toLowerCase(), expected)) {
      return { ok: false, error: 'bad_signature', status: 401 }
    }
    return { ok: true, mode: 'hmac' }
  }

  const headerSecret = req.headers.get('x-bank-webhook-secret')?.trim()
  if (headerSecret && constantTimeEqual(headerSecret, secret)) {
    if (Deno.env.get('BANK_WEBHOOK_REQUIRE_HMAC')?.trim() === '1') {
      return { ok: false, error: 'hmac_required', status: 401 }
    }
    console.warn('bank-webhook: legacy shared-secret auth used')
    return { ok: true, mode: 'shared' }
  }

  return { ok: false, error: 'unauthorized', status: 401 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const secret = Deno.env.get('BANK_PAYMENT_WEBHOOK_SECRET')?.trim()
    if (!secret) {
      return json({ error: 'webhook_not_configured' }, 503)
    }

    const rawBody = await req.text()
    const auth = await verifyWebhook(req, rawBody, secret)
    if (!auth.ok) {
      return json({ error: auth.error }, auth.status)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'server_misconfigured' }, 500)
    }

    let body: {
      transaction_date?: string
      amount?: number | string
      description?: string
      reference_text?: string
      external_id?: string
    }
    try {
      body = (rawBody ? JSON.parse(rawBody) : {}) as typeof body
    } catch {
      return json({ error: 'invalid_json' }, 400)
    }

    const amount = Number(body.amount)
    const transactionDate = body.transaction_date?.trim()
    if (!transactionDate || !Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'transaction_date_and_positive_amount_required' }, 400)
    }

    const externalId = body.external_id?.trim()
    if (!externalId && Deno.env.get('BANK_WEBHOOK_REQUIRE_EXTERNAL_ID')?.trim() === '1') {
      return json({ error: 'external_id_required' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: imported, error: importErr } = await admin.rpc(
      'import_bank_statement_lines',
      {
        p_source: 'webhook',
        p_filename: 'webhook',
        p_lines: [
          {
            transaction_date: transactionDate,
            amount,
            description: body.description?.trim() ?? null,
            reference_text: body.reference_text?.trim() ?? null,
            external_id: externalId ?? null,
          },
        ],
      },
    )

    if (importErr) {
      console.error('import_bank_statement_lines', importErr.message)
      return json({ error: 'import_failed' }, 500)
    }

    const importRow = imported as { import_id?: string; inserted?: number } | null
    const importId = importRow?.import_id

    const { data: matchResult, error: matchErr } = await admin.rpc(
      'run_bank_payment_matching',
      { p_import_id: importId ?? null },
    )

    if (matchErr) {
      console.error('run_bank_payment_matching', matchErr.message)
      return json({ ok: true, imported: importRow, match_error: 'match_failed' })
    }

    const match = matchResult as {
      auto_confirmed_payment_ids?: string[]
    } | null
    const autoIds = match?.auto_confirmed_payment_ids ?? []
    for (const paymentId of autoIds) {
      if (typeof paymentId !== 'string' || !paymentId.trim()) continue
      void notifyPaymentCustomerLine(admin, paymentId.trim(), 'payment_confirmed').catch((e) =>
        console.warn('LINE payment_confirmed bank auto', (e as Error)?.message),
      )
    }

    return json({ ok: true, imported: importRow, match: matchResult, auth_mode: auth.mode })
  } catch (e) {
    console.error('bank-payment-webhook', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'internal_error' }, 500)
  }
})
