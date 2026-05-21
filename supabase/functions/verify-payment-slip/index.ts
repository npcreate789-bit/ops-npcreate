import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { authorizePaymentEdge } from '../_shared/paymentEdgeAuth.ts'
import { notifyPaymentCustomerLine } from '../_shared/paymentCustomerLineNotify.ts'
import { runSlipOcr } from '../_shared/slipOcr.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-payment-edge-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function guessMime(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'image/jpeg'
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
      force?: boolean
    }
    const paymentId = body.payment_id?.trim()
    const force = body.force === true
    if (!paymentId) {
      return json({ error: 'payment_id required' }, 400)
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const authz = await authorizePaymentEdge(req, admin, paymentId, {
      publicToken: body.public_token,
    })
    if (!authz.ok) {
      return json({ error: authz.error }, authz.status)
    }

    const isPublic = authz.mode === 'public_token'
    if (force && isPublic) {
      return json({ error: 'force_not_allowed_for_public' }, 403)
    }

    const { data: payment, error: payErr } = await admin
      .from('payments')
      .select('id, slip_path, status, verification_status, verification_result')
      .eq('id', paymentId)
      .maybeSingle()

    if (payErr) {
      return json({ error: payErr.message }, 500)
    }
    if (!payment) {
      return json({ error: 'Payment not found' }, 404)
    }

    if (payment.status !== 'pending' || payment.verification_status !== 'verifying') {
      return json({ ok: true, skipped: true, reason: 'not_verifying' })
    }

    if (payment.verification_result != null && !force) {
      return json({ ok: true, skipped: true, reason: 'already_processed' })
    }

    if (force && payment.verification_result != null) {
      await admin
        .from('payments')
        .update({ verification_result: null, verification_decision: null })
        .eq('id', paymentId)
    }

    const slipPath = payment.slip_path?.trim()
    if (!slipPath) {
      return json({ error: 'No slip on payment' }, 400)
    }

    const { data: blob, error: dlErr } = await admin.storage.from('payments').download(slipPath)
    if (dlErr || !blob) {
      console.error('slip download', paymentId, dlErr?.message)
      const { data: applyData, error: applyErr } = await admin.rpc(
        'apply_payment_slip_verification',
        {
          p_payment_id: paymentId,
          p_ocr: {
            error: 'โหลดไฟล์สลิปไม่สำเร็จ',
            confidence: 0,
            ocr_provider: 'none',
          },
        },
      )
      if (applyErr) return json({ error: applyErr.message }, 500)
      return json({ ok: true, apply: applyData })
    }

    const bytes = new Uint8Array(await blob.arrayBuffer())
    const mime = blob.type?.trim() || guessMime(slipPath)
    const ocr = await runSlipOcr(bytes, mime)

    const { data: applyData, error: applyErr } = await admin.rpc(
      'apply_payment_slip_verification',
      {
        p_payment_id: paymentId,
        p_ocr: ocr,
      },
    )

    if (applyErr) {
      console.error('apply_payment_slip_verification', applyErr.message)
      return json({ error: 'apply_failed' }, 500)
    }

    const apply = applyData as { decision?: string; auto_pass?: boolean } | null
    if (apply?.auto_pass || apply?.decision === 'auto_pass') {
      void notifyPaymentCustomerLine(admin, paymentId, 'payment_confirmed').catch((e) =>
        console.warn('LINE payment_confirmed', e),
      )
    } else if (apply?.decision === 'review_required') {
      void notifyPaymentCustomerLine(admin, paymentId, 'review_pending').catch((e) =>
        console.warn('LINE review_pending', e),
      )
    }

    if (isPublic) {
      return json({
        ok: true,
        decision: apply?.decision ?? null,
        auto_pass: apply?.auto_pass ?? false,
      })
    }
    return json({ ok: true, ocr, apply: applyData })
  } catch (e) {
    console.error('verify-payment-slip', e instanceof Error ? e.message : 'unknown')
    return json({ error: 'internal_error' }, 500)
  }
})
