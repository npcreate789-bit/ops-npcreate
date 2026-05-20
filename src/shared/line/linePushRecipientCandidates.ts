import { isLineMessagingUserId } from './lineStaffOpenUrl'
import {
  type LeadLineIds,
  lineLoginAndOaIdsMismatch,
  resolveLineMessagingRecipientId,
} from './lineUserIdResolution'

function norm(id: string | null | undefined): string {
  return id?.trim() ?? ''
}

/** ลำดับ user id สำหรับ push — ให้ตรงกับ send-line-push (_shared/linePushRecipient) */
export function buildLinePushCandidateIds(input: {
  lineIds: LeadLineIds
  inboundUserIdsNewestFirst: string[]
  preferredTo?: string
}): string[] {
  const login = norm(input.lineIds.line_user_id)
  const oa = norm(input.lineIds.line_oa_chat_user_id)
  const mismatch = lineLoginAndOaIdsMismatch(input.lineIds)
  const seen = new Set<string>()
  const out: string[] = []

  const add = (id: string | undefined) => {
    const t = norm(id)
    if (!t || !isLineMessagingUserId(t)) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }

  add(input.preferredTo)

  const inbounds = input.inboundUserIdsNewestFirst
    .map((id) => norm(id))
    .filter((id) => isLineMessagingUserId(id))

  if (mismatch) {
    for (const id of inbounds) {
      if (login && id.toLowerCase() === login.toLowerCase()) continue
      add(id)
    }
    add(oa)
  } else {
    for (const id of inbounds) add(id)
    add(oa)
    add(login)
  }

  return out
}

/** เลือก ID แรกในลำดับ candidate (ไม่ใช้ LINE Login เมื่อ mismatch แล้ว) */
export function pickLinePushRecipientFromCandidates(
  lineIds: LeadLineIds,
  inboundUserIdsNewestFirst: string[],
  preferredTo?: string,
): string | null {
  const candidates = buildLinePushCandidateIds({
    lineIds,
    inboundUserIdsNewestFirst,
    preferredTo,
  })
  return candidates[0] ?? null
}

/** เมื่อไม่มี inbound — ใช้ OA ก่อน login (หรือ null ถ้า mismatch แล้วไม่มี OA) */
export function resolveLineMessagingRecipientIdWhenNoInbound(
  lineIds: LeadLineIds,
): string | null {
  if (lineLoginAndOaIdsMismatch(lineIds)) {
    const oa = norm(lineIds.line_oa_chat_user_id)
    return oa && isLineMessagingUserId(oa) ? oa : null
  }
  return resolveLineMessagingRecipientId(lineIds)
}
