const DOCUMENTED_LINE_CHAT_USER_EXAMPLE_IDS = new Set([
  'u1bfd708d6595baea50b50568a7b84b5f',
])

function isDocumentedLineChatUserExampleId(userId: string | undefined): boolean {
  const t = userId?.trim().toLowerCase()
  return Boolean(t && DOCUMENTED_LINE_CHAT_USER_EXAMPLE_IDS.has(t))
}

export function formatLineMessagingApiError(
  status: number,
  bodyText: string,
  context: 'profile' | 'push',
  failedUserId?: string,
): string {
  let message = bodyText
  try {
    const parsed = JSON.parse(bodyText) as { message?: string }
    if (parsed.message) message = parsed.message
  } catch {
    /* plain text */
  }

  const lower = message.toLowerCase()

  if (status === 401) {
    return 'Channel Access Token ไม่ถูกต้องหรือหมดอายุ — ตั้ง LINE_MESSAGING_CHANNEL_ACCESS_TOKEN จาก Messaging API channel (ไม่ใช่ LINE Login)'
  }

  if (
    lower.includes("hasn't added the bot") ||
    lower.includes('not a friend') ||
    lower.includes('are blocked')
  ) {
    return 'ลูกค้ายังไม่ได้เป็นเพื่อนกับ Official Account นี้ — ให้กด Add friend แล้วทักข้อความหนึ่งครั้ง'
  }

  if (context === 'profile' && status === 404) {
    if (isDocumentedLineChatUserExampleId(failedUserId)) {
      return (
        'User ID นี้เป็นตัวอย่างในเอกสารระบบ ไม่ใช่ลูกค้าจริง — เปิดแชทลูกค้าบน chat.line.biz ' +
        'แล้วบันทึกส่วนหลัง /chat/ ในหน้า Lead'
      )
    }
    return (
      'ระบบไม่พบลูกค้าใน OA ชุดนี้ — User ID อาจผิดช่อง (ใส่ account id แทน user หลัง /chat/) ' +
      'หรือ LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ไม่ใช่ช่อง @npcreate เดียวกับ webhook — ' +
      'ให้ลูกค้าทัก @npcreate แล้วบันทึก ID จาก URL แชทลูกค้าในหน้า Lead'
    )
  }

  if (
    (context === 'push' || context === 'profile') &&
    (status === 400 || status === 404) &&
    isDocumentedLineChatUserExampleId(failedUserId)
  ) {
    return (
      'User ID นี้เป็นตัวอย่างในเอกสารระบบ ไม่ใช่ลูกค้าจริง — เปิดแชทลูกค้าบน chat.line.biz ' +
      'แล้วบันทึกส่วนหลัง /chat/ ในหน้า Lead'
    )
  }

  if (lower.includes('invalid') && (lower.includes('to') || lower.includes('user'))) {
    return 'LINE User ID ไม่ตรงกับ Messaging API channel นี้ — บันทึก ID จาก URL แชทบน chat.line.biz (หลัง /chat/) ไม่ใช่ ID จาก LINE Login'
  }

  if (context === 'push' && status === 429) {
    return 'ส่งข้อความถี่เกินไป — รอสักครู่แล้วลองใหม่'
  }

  const snippet = message.length > 160 ? `${message.slice(0, 160)}…` : message
  return `LINE API (${status}): ${snippet}`
}
