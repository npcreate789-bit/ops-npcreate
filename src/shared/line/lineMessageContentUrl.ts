import { isSupabaseConfigured, supabase } from '../supabase/client'

/** โหลดรูป/สื่อจาก LINE Content API ผ่าน Edge Function (ต้อง login) */
export async function fetchLineMessageContentObjectUrl(
  lineContentMessageId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null

  const id = lineContentMessageId.trim()
  if (!id) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return null

  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) return null

  const url = `${base}/functions/v1/line-message-content?messageId=${encodeURIComponent(id)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
  })

  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
