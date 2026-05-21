import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { ParsedBankLine } from '../bank/parseBankStatementCsv'

export interface BankStatementQueueItem {
  id: string
  transaction_date: string
  amount: number
  description: string | null
  reference_text: string | null
  status: string
  match_confidence: number | null
  match_notes: string | null
  suggested_match: {
    payment_id: string
    quotation_number: string | null
    confidence: number
  } | null
}

export async function importBankStatementLines(
  lines: ParsedBankLine[],
  filename: string,
): Promise<{ import_id: string; inserted: number; skipped: number }> {
  if (!isSupabaseConfigured || !supabase) {
    return { import_id: 'mock', inserted: lines.length, skipped: 0 }
  }

  const { data, error } = await supabase.rpc('import_bank_statement_lines', {
    p_source: 'csv',
    p_filename: filename,
    p_lines: lines,
  })
  if (error) throw new Error(error.message)

  const row = data as {
    import_id?: string
    inserted?: number
    skipped?: number
  }
  return {
    import_id: row.import_id ?? '',
    inserted: row.inserted ?? 0,
    skipped: row.skipped ?? 0,
  }
}

export async function runBankPaymentMatching(
  importId?: string,
): Promise<{
  suggested: number
  auto_confirmed: number
  auto_confirmed_payment_ids: string[]
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { suggested: 0, auto_confirmed: 0, auto_confirmed_payment_ids: [] }
  }

  const { data, error } = await supabase.rpc('run_bank_payment_matching', {
    p_import_id: importId ?? null,
  })
  if (error) throw new Error(error.message)

  const row = data as {
    suggested?: number
    auto_confirmed?: number
    auto_confirmed_payment_ids?: string[]
  }
  const ids = row.auto_confirmed_payment_ids
  return {
    suggested: row.suggested ?? 0,
    auto_confirmed: row.auto_confirmed ?? 0,
    auto_confirmed_payment_ids: Array.isArray(ids) ? ids.map(String) : [],
  }
}

export async function listBankStatementQueue(): Promise<BankStatementQueueItem[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase.rpc('list_bank_statement_lines_queue')
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) return []
  return data as BankStatementQueueItem[]
}

export async function confirmPaymentBankMatch(
  lineId: string,
  paymentId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.rpc('confirm_payment_bank_match', {
    p_line_id: lineId,
    p_payment_id: paymentId,
    p_auto: false,
  })
  if (error) throw new Error(error.message)
}

export async function ignoreBankStatementLine(lineId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const { error } = await supabase.rpc('ignore_bank_statement_line', {
    p_line_id: lineId,
  })
  if (error) throw new Error(error.message)
}
