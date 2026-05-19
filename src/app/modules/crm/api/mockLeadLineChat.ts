import type { LeadLineMessage } from '../types/leadLineChat'

const store = new Map<string, LeadLineMessage[]>()

function seedId(): string {
  return crypto.randomUUID()
}

export const mockLeadLineMessages = {
  list(leadId: string): LeadLineMessage[] {
    return [...(store.get(leadId) ?? [])]
  },

  append(
    leadId: string,
    partial: Omit<LeadLineMessage, 'id' | 'created_at' | 'lead_id' | 'metadata'> & {
      lead_id?: string
      metadata?: Record<string, unknown>
    },
  ): LeadLineMessage {
    const row: LeadLineMessage = {
      id: seedId(),
      lead_id: leadId,
      line_user_id: partial.line_user_id,
      direction: partial.direction,
      body: partial.body,
      message_type: partial.message_type,
      line_message_id: partial.line_message_id ?? null,
      sender_profile_id: partial.sender_profile_id ?? null,
      metadata: partial.metadata ?? {},
      created_at: new Date().toISOString(),
    }
    const rows = store.get(leadId) ?? []
    rows.push(row)
    store.set(leadId, rows)
    return row
  },
}
