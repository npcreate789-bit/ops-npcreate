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
    partial: Omit<
      LeadLineMessage,
      'id' | 'created_at' | 'lead_id' | 'metadata' | 'deleted_at' | 'deleted_by'
    > & {
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
      deleted_at: null,
      deleted_by: null,
    }
    const rows = store.get(leadId) ?? []
    rows.push(row)
    store.set(leadId, rows)
    return row
  },

  softDelete(messageId: string): void {
    for (const rows of store.values()) {
      const row = rows.find((m) => m.id === messageId)
      if (!row) continue
      if (row.direction !== 'outbound') {
        throw new Error('ลบได้เฉพาะข้อความที่ทีมส่งจากระบบ')
      }
      row.deleted_at = new Date().toISOString()
      return
    }
    throw new Error('ไม่พบข้อความ')
  },
}
