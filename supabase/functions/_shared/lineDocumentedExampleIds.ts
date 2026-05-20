const DOCUMENTED_LINE_CHAT_USER_EXAMPLE_IDS = new Set([
  'u1bfd708d6595baea50b50568a7b84b5f',
])

export function isDocumentedLineChatUserExampleId(id: string | null | undefined): boolean {
  const t = id?.trim().toLowerCase()
  return Boolean(t && DOCUMENTED_LINE_CHAT_USER_EXAMPLE_IDS.has(t))
}
