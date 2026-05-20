import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

import { isDocumentedLineChatUserExampleId } from '../_shared/lineDocumentedExampleIds.ts'

function idsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** ลำดับ ID สำรองเมื่อ profile 404 — outbound ก่อน แล้ว OA ในฟอร์ม แล้ว inbound (ไม่ใช่ Login) */
export async function collectLeadLinePushCandidates(
  admin: SupabaseClient,
  leadId: string,
  failedTo: string,
): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()
  const failed = failedTo.trim().toLowerCase()

  const oaAccountId = Deno.env.get('LINE_CHAT_BIZ_ACCOUNT_ID')?.trim() ?? ''

  const add = (id: string | null | undefined) => {
    const t = id?.trim()
    if (!t || t.length > 64) return
    const key = t.toLowerCase()
    if (key === failed || seen.has(key)) return
    if (oaAccountId && key === oaAccountId.toLowerCase()) return
    if (isDocumentedLineChatUserExampleId(t)) return
    seen.add(key)
    out.push(t)
  }

  const { data: lead } = await admin
    .from('leads')
    .select('line_oa_chat_user_id, line_user_id')
    .eq('id', leadId)
    .maybeSingle()

  const login = (lead?.line_user_id as string | null)?.trim() ?? ''
  const oa = (lead?.line_oa_chat_user_id as string | null)?.trim() ?? ''
  const mismatch = Boolean(login && oa && !idsEqual(login, oa))

  const { data: msgs } = await admin
    .from('lead_line_messages')
    .select('line_user_id, direction')
    .eq('lead_id', leadId)
    .not('line_user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  for (const row of msgs ?? []) {
    if (row.direction !== 'inbound') continue
    add(row.line_user_id as string)
  }

  for (const row of msgs ?? []) {
    if (row.direction !== 'outbound') continue
    const id = row.line_user_id as string
    if (mismatch && login && idsEqual(id, login)) continue
    add(id)
  }

  add(oa)

  if (!mismatch) add(login)

  return out
}

export async function fetchLineUserProfile(
  lineUserId: string,
  lineToken: string,
): Promise<Response> {
  return fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId.trim())}`, {
    headers: { Authorization: `Bearer ${lineToken}` },
  })
}
