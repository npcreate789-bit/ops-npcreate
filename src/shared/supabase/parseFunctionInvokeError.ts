/** ดึงข้อความ error จาก supabase.functions.invoke อย่างปลอดภัย */
export async function parseFunctionInvokeError(
  error: { message: string; context?: unknown },
  data: unknown,
): Promise<string> {
  if (data && typeof data === 'object' && data !== null && 'error' in data) {
    const msg = (data as { error: unknown }).error
    if (typeof msg === 'string' && msg) return msg
  }

  const ctx = error.context

  if (ctx instanceof Response) {
    try {
      const body = (await ctx.clone().json()) as { error?: string }
      if (body?.error) return body.error
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
    if (typeof msg === 'string' && msg) return msg
  }

  if (error.message.includes('Failed to send') || error.message.includes('Function not found')) {
    return 'ยังไม่ได้ deploy Edge Function — ติดต่อทีม IT'
  }

  return error.message || 'เรียกฟังก์ชันไม่สำเร็จ'
}
