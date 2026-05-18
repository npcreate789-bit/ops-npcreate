import { lineOaStarterMessageUrl } from '../../../../shared/contact/channelConnectConfig'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'

export type ContactLineHandoffMode = 'push' | 'open_chat'

export interface ContactLineHandoffResult {
  mode: ContactLineHandoffMode
  url: string
  pushedToChat: boolean
  reason?: string
}

const RETRYABLE_REASONS = new Set(['push_failed', 'not_friend', 'oa_chat_id_mismatch'])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function invokeHandoff(input: {
  leadId: string
  lineUserId: string
  text: string
}): Promise<ContactLineHandoffResult> {
  const url = lineOaStarterMessageUrl(input.text)

  const { data, error } = await supabase!.functions.invoke('contact-line-handoff', {
    body: {
      lead_id: input.leadId,
      line_user_id: input.lineUserId,
      text: input.text,
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    console.warn('contact-line-handoff', message)
    return { mode: 'open_chat', url, pushedToChat: false, reason: 'push_failed' }
  }

  const result = data as {
    ok?: boolean
    mode?: ContactLineHandoffMode
    url?: string
    reason?: string
    error?: string
  } | null

  if (result?.error) {
    return { mode: 'open_chat', url, pushedToChat: false, reason: 'push_failed' }
  }

  if (result?.mode === 'push' && result.ok) {
    return {
      mode: 'push',
      url: result.url?.trim() || url,
      pushedToChat: true,
    }
  }

  return {
    mode: 'open_chat',
    url: result?.url?.trim() || url,
    pushedToChat: false,
    reason: result?.reason ?? 'push_failed',
  }
}

export async function deliverContactLineHandoff(input: {
  leadId: string
  lineUserId: string
  text: string
}): Promise<ContactLineHandoffResult> {
  const url = lineOaStarterMessageUrl(input.text)

  if (!isSupabaseConfigured || !supabase) {
    return { mode: 'open_chat', url, pushedToChat: false, reason: 'no_messaging_token' }
  }

  let last = await invokeHandoff(input)
  if (last.pushedToChat) return last

  if (last.reason && RETRYABLE_REASONS.has(last.reason)) {
    await sleep(600)
    last = await invokeHandoff(input)
  }

  return last
}
