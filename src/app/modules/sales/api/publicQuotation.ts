import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import type { PublicQuotation, Quotation } from '../types'
import { isQuotationSentLike } from '../constants'
import { mockSalesApi } from './mockStore'

function parsePublicPayload(data: unknown): PublicQuotation | null {
  if (!data || typeof data !== 'object') return null
  return data as PublicQuotation
}

export async function fetchPublicQuotation(token: string): Promise<PublicQuotation | null> {
  if (!token.trim()) return null

  if (!isSupabaseConfigured || !supabase) {
    return mockSalesApi.getPublicByToken(token)
  }

  const { data, error } = await supabase.rpc('get_public_quotation', {
    p_token: token,
  })
  if (error) throw new Error(error.message)
  return parsePublicPayload(data)
}

export async function markPublicQuotationViewed(token: string): Promise<PublicQuotation | null> {
  if (!token.trim()) return null

  if (!isSupabaseConfigured || !supabase) {
    return mockSalesApi.markPublicViewed(token)
  }

  const { data, error } = await supabase.rpc('mark_quotation_viewed', {
    p_token: token,
  })
  if (error) throw new Error(error.message)
  return parsePublicPayload(data)
}

export async function acceptPublicQuotation(
  token: string,
  acceptedByName?: string,
): Promise<PublicQuotation | null> {
  if (!token.trim()) return null

  if (!isSupabaseConfigured || !supabase) {
    return mockSalesApi.acceptPublic(token, acceptedByName)
  }

  const { data, error } = await supabase.rpc('accept_public_quotation', {
    p_token: token,
    p_accepted_by_name: acceptedByName?.trim() || null,
    p_note: null,
  })
  if (error) throw new Error(error.message)
  return parsePublicPayload(data)
}

export function publicQuotationToPrintModel(payload: PublicQuotation): Quotation {
  return {
    id: payload.id,
    quotation_number: payload.quotation_number,
    lead_id: null,
    customer_id: null,
    owner_id: '',
    status: payload.status,
    subtotal: payload.subtotal,
    discount: payload.discount,
    vat_rate: payload.vat_rate,
    vat_amount: payload.vat_amount,
    total: payload.total,
    contract_months: payload.contract_months,
    terms: payload.terms,
    notes: payload.notes,
    sent_at: payload.sent_at,
    viewed_at: payload.viewed_at,
    accepted_at: payload.accepted_at,
    paid_at: payload.paid_at,
    public_token: null,
    created_at: payload.created_at,
    updated_at: payload.created_at,
    items: payload.items.map((item) => ({
      ...item,
      quotation_id: payload.id,
      package_id: null,
    })),
  }
}

export function isPublicQuotationVisible(status: PublicQuotation['status']): boolean {
  return isQuotationSentLike(status)
}
