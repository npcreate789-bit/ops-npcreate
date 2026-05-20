/** สร้างลำดับ LINE user id สำหรับลอง profile/push (ให้ตรงกับ client resolveLeadLinePushRecipient) */

function norm(id: string | null | undefined): string {
  return id?.trim() ?? ''
}

export function lineLoginAndOaIdsMismatch(
  lineUserId: string | null | undefined,
  lineOaChatUserId: string | null | undefined,
): boolean {
  const login = norm(lineUserId)
  const oa = norm(lineOaChatUserId)
  if (!login || !oa) return false
  if (!/^U[0-9a-f]{32}$/i.test(login) || !/^U[0-9a-f]{32}$/i.test(oa)) return false
  return login.toLowerCase() !== oa.toLowerCase()
}

function isLineUserId(id: string): boolean {
  return /^U[0-9a-f]{32}$/i.test(id.trim())
}

export function buildLinePushCandidateIds(input: {
  requestedTo?: string
  lineUserId?: string | null
  lineOaChatUserId?: string | null
  inboundUserIdsNewestFirst?: string[]
}): string[] {
  const login = norm(input.lineUserId)
  const oa = norm(input.lineOaChatUserId)
  const mismatch = lineLoginAndOaIdsMismatch(login, oa)
  const seen = new Set<string>()
  const out: string[] = []

  const add = (id: string | undefined) => {
    const t = norm(id)
    if (!t || !isLineUserId(t)) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }

  add(input.requestedTo)

  const inbounds = (input.inboundUserIdsNewestFirst ?? [])
    .map((id) => norm(id))
    .filter((id) => isLineUserId(id))

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
