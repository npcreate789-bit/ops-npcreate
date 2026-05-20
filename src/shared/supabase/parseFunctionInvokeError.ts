function appendLinePushToHint(message: string, payload: unknown): string {
  if (!payload || typeof payload !== 'object' || !('to' in payload)) return message
  const to = (payload as { to: unknown }).to
  if (typeof to !== 'string' || !to.trim()) return message
  const id = to.trim()
  const short = id.length > 22 ? `${id.slice(0, 10)}…${id.slice(-8)}` : id
  if (message.includes(short) || message.includes(id)) return message
  return `${message} (ID: ${short})`
}

/** ดึงข้อความ error จาก supabase.functions.invoke อย่างปลอดภัย */
export async function parseFunctionInvokeError(
  error: { message: string; context?: unknown },
  data: unknown,
): Promise<string> {
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const msg = (data as { error: unknown }).error
    if (typeof msg === 'string' && msg) return appendLinePushToHint(msg, data)
  }

  const ctx = error.context

  if (ctx instanceof Response) {
    try {
      const body = (await ctx.clone().json()) as { error?: string; to?: string }
      if (body?.error) return appendLinePushToHint(body.error, body)
    } catch {
      try {
        const text = await ctx.clone().text()
        if (text) return text
      } catch {
        /* ignore */
      }
    }
  }

  if (ctx && typeof ctx === 'object' && 'error' in ctx) {
    const msg = (ctx as { error: unknown }).error
    if (typeof msg === 'string' && msg) return appendLinePushToHint(msg, ctx)
  }

  if (error.message.includes('Failed to send') || error.message.includes('Function not found')) {
    return 'ยังไม่ได้ deploy Edge Function — ติดต่อทีม IT'
  }

  return error.message || 'เรียกฟังก์ชันไม่สำเร็จ'
}
