import type { ReactNode } from 'react'

const MENTION_RE = /@([a-z0-9._-]{2,32})/gi

export function renderChatBody(body: string): ReactNode[] {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(MENTION_RE.source, 'gi')

  while ((match = re.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index))
    }
    parts.push(
      <span key={`${match.index}-${match[0]}`} className="chat-mention">
        {match[0]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [body]
}

export function getActiveMentionQuery(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor)
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  const between = before.slice(at + 1)
  if (/\s/.test(between)) return null
  return { start: at, query: between.toLowerCase() }
}

export function insertMention(
  text: string,
  mentionStart: number,
  cursor: number,
  loginId: string,
): { next: string; cursor: number } {
  const before = text.slice(0, mentionStart)
  const after = text.slice(cursor)
  const mention = `@${loginId} `
  const next = `${before}${mention}${after}`
  const nextCursor = before.length + mention.length
  return { next, cursor: nextCursor }
}
