import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import type { PaymentLineEvent } from './paymentLineMessages.ts'

const STAFF_ROLES = new Set(['ceo', 'admin', 'dev', 'account', 'operations'])

/** ลูกค้าสาธารณะเรียก notify ได้เฉพาะช่วงรอชำระ + event เหล่านี้ */
const PUBLIC_TOKEN_NOTIFY_EVENTS = new Set<PaymentLineEvent>([
  'slip_received',
  'review_pending',
])

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

function headerSecretOk(req: Request): boolean {
  const expected = Deno.env.get('PAYMENT_EDGE_SECRET')?.trim()
  if (!expected) return false
  const got = req.headers.get('x-payment-edge-secret')?.trim()
  if (!got) return false
  return constantTimeEqual(got, expected)
}

async function staffUserOk(
  admin: SupabaseClient,
  req: Request,
): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')?.trim()
  if (!authHeader?.startsWith('Bearer ')) return false
  const jwt = authHeader.slice(7).trim()
  if (!jwt) return false

  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user?.id) return false

  const { data: roles, error: roleErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id)

  if (roleErr || !roles?.length) return false
  return roles.some((r) => STAFF_ROLES.has(String(r.role)))
}

async function publicTokenOk(
  admin: SupabaseClient,
  paymentId: string,
  publicToken: string,
): Promise<boolean> {
  const token = publicToken.trim()
  if (!token) return false

  const { data: payment, error: payErr } = await admin
    .from('payments')
    .select('quotation_id')
    .eq('id', paymentId)
    .maybeSingle()

  if (payErr || !payment?.quotation_id) return false

  const { data: q, error: qErr } = await admin
    .from('quotations')
    .select('public_token, status')
    .eq('id', payment.quotation_id)
    .maybeSingle()

  if (qErr || !q) return false
  if (String(q.public_token) !== token) return false
  return q.status === 'awaiting_payment'
}

export type PaymentEdgeAuthMode = 'secret' | 'public_token' | 'staff'

export type PaymentEdgeAuthResult =
  | { ok: true; mode: PaymentEdgeAuthMode }
  | { ok: false; status: number; error: string }

/** อนุญาต: PAYMENT_EDGE_SECRET, staff JWT, หรือ public_token (awaiting_payment เท่านั้น) */
export async function authorizePaymentEdge(
  req: Request,
  admin: SupabaseClient,
  paymentId: string,
  opts?: { publicToken?: string | null },
): Promise<PaymentEdgeAuthResult> {
  if (!paymentId.trim()) {
    return { ok: false, status: 400, error: 'payment_id required' }
  }

  if (headerSecretOk(req)) {
    return { ok: true, mode: 'secret' }
  }

  if (opts?.publicToken && (await publicTokenOk(admin, paymentId, opts.publicToken))) {
    return { ok: true, mode: 'public_token' }
  }

  if (await staffUserOk(admin, req)) {
    return { ok: true, mode: 'staff' }
  }

  return { ok: false, status: 401, error: 'Unauthorized' }
}

/** notify LINE — public_token จำกัด event และเฉพาะใบ awaiting_payment */
export async function authorizePaymentLineNotify(
  req: Request,
  admin: SupabaseClient,
  paymentId: string,
  event: PaymentLineEvent,
  opts?: { publicToken?: string | null },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!paymentId.trim()) {
    return { ok: false, status: 400, error: 'payment_id required' }
  }

  if (headerSecretOk(req)) {
    return { ok: true }
  }

  if (await staffUserOk(admin, req)) {
    return { ok: true }
  }

  const token = opts?.publicToken?.trim()
  if (token) {
    if (!PUBLIC_TOKEN_NOTIFY_EVENTS.has(event)) {
      return { ok: false, status: 403, error: 'Event not allowed for public token' }
    }
    if (await publicTokenOk(admin, paymentId, token)) {
      return { ok: true }
    }
  }

  return { ok: false, status: 401, error: 'Unauthorized' }
}
