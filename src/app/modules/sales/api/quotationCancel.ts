import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'

export async function cancelQuotationAfterAccept(
  quotationId: string,
  reason?: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.rpc('cancel_quotation_after_accept', {
    p_quotation_id: quotationId,
    p_reason: reason?.trim() || null,
  })
  if (error) throw new Error(error.message)
}
