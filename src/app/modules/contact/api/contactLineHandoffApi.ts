import { lineOaStarterMessageUrl } from '../../../../shared/contact/channelConnectConfig'
import { isSupabaseConfigured, supabase } from '../../../../shared/supabase/client'
import { parseFunctionInvokeError } from '../../../../shared/supabase/parseFunctionInvokeError'

export type ContactLineHandoffMode = 'push' | 'open_chat'

export interface ContactLineHandoffResult {
  mode: ContactLineHandoffMode
  url: string
  pushedToChat: boolean
}

export async function deliverContactLineHandoff(input: {
  leadId: string
  lineUserId: string
  text: string
}): Promise<ContactLineHandoffResult> {
  const url = lineOaStarterMessageUrl(input.text)

  if (!isSupabaseConfigured || !supabase) {
    return { mode: 'open_chat', url, pushedToChat: false }
  }

  const { data, error } = await supabase.functions.invoke('contact-line-handoff', {
    body: {
      lead_id: input.leadId,
      line_user_id: input.lineUserId,
      text: input.text,
    },
  })

  if (error) {
    const message = await parseFunctionInvokeError(error, data)
    console.warn('contact-line-handoff', message)
    return { mode: 'open_chat', url, pushedToChat: false }
  }

  const result = data as {
    ok?: boolean
    mode?: ContactLineHandoffMode
    url?: string
  } | null

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
  }
}
