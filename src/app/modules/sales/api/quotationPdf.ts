import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'

export type EnsureQuotationPdfResult =
  | { ok: true; pdfUrl: string; cached?: boolean }
  | { ok: false; error: string }

/** สร้างหรือใช้ PDF ที่แคชไว้ — คืน signed URL สำหรับแนบในข้อความ LINE */
export async function ensureQuotationPdfDownloadUrl(
  quotationId: string,
  options?: { regenerate?: boolean },
): Promise<EnsureQuotationPdfResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'โหมดพัฒนา — ยังไม่มี Supabase สำหรับสร้าง PDF' }
  }

  const { data, error } = await supabase.functions.invoke('generate-quotation-pdf', {
    body: {
      quotation_id: quotationId,
      regenerate: options?.regenerate ?? false,
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    return { ok: false, error: message }
  }

  const result = data as { ok?: boolean; pdf_url?: string; error?: string; cached?: boolean } | null
  if (!result?.ok || !result.pdf_url) {
    return { ok: false, error: result?.error ?? 'สร้าง PDF ไม่สำเร็จ' }
  }

  return { ok: true, pdfUrl: result.pdf_url, cached: result.cached }
}
