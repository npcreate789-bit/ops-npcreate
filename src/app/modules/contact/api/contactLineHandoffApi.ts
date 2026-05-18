import { lineOaStarterMessageUrl } from '../../../../shared/contact/channelConnectConfig'

export type ContactLineHandoffMode = 'push' | 'open_chat'

export interface ContactLineHandoffResult {
  mode: ContactLineHandoffMode
  url: string
  pushedToChat: boolean
  reason?: string
}

/** Messaging API push ปิดแล้ว — ใช้ oaMessage + กดส่งในแอปเท่านั้น */
export async function deliverContactLineHandoff(input: {
  leadId: string
  lineUserId: string
  text: string
}): Promise<ContactLineHandoffResult> {
  const url = lineOaStarterMessageUrl(input.text)
  return { mode: 'open_chat', url, pushedToChat: false, reason: 'messaging_api_disabled' }
}
