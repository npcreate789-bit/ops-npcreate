import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { QuotationPaymentQueueItem } from '../types/paymentQueue'

function parseQueue(data: unknown): QuotationPaymentQueueItem[] {
  if (!Array.isArray(data)) return []
  return data as QuotationPaymentQueueItem[]
}

export async function listQuotationsPendingPaymentInstructions(): Promise<
  QuotationPaymentQueueItem[]
> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase.rpc('list_quotations_pending_payment_instructions')
  if (error) throw new Error(error.message)
  return parseQueue(data)
}

export async function notifyPaymentInstructionsSlaOverdue(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0

  const { data, error } = await supabase.rpc('notify_payment_instructions_sla_overdue')
  if (error) throw new Error(error.message)
  return typeof data === 'number' ? data : 0
}

export async function markQuotationPaymentInstructionsSent(
  quotationId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.rpc('mark_quotation_payment_instructions_sent', {
    p_quotation_id: quotationId,
  })
  if (error) throw new Error(error.message)
}
