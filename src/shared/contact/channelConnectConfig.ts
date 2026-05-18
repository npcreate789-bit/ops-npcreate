import { isSupabaseConfigured } from '../supabase/client'
import { getAppOrigin } from '../config/appUrl'

export const LINE_CHANNEL_ID =
  (import.meta.env.VITE_LINE_CHANNEL_ID as string | undefined)?.trim() || ''

export const LINE_OA_ID =
  (import.meta.env.VITE_LINE_OA_ID as string | undefined)?.trim() || '@npcreate'

export const FACEBOOK_APP_ID =
  (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined)?.trim() || ''

export const FACEBOOK_PAGE_ID =
  (import.meta.env.VITE_FACEBOOK_PAGE_ID as string | undefined)?.trim() || ''

const LINE_OAUTH_STATE_KEY = 'npc_contact_line_oauth_state'
const LINE_USER_KEY = 'npc_contact_line_user_id'
const LINE_NAME_KEY = 'npc_contact_line_display_name'
const FB_PSID_KEY = 'npc_contact_facebook_psid'
const FB_NAME_KEY = 'npc_contact_facebook_name'

export function isLineOAuthConfigured(): boolean {
  return Boolean(LINE_CHANNEL_ID && isSupabaseConfigured)
}

export function isFacebookLoginConfigured(): boolean {
  return Boolean(FACEBOOK_APP_ID)
}

export function isFacebookChatConfigured(): boolean {
  return Boolean(FACEBOOK_PAGE_ID && FACEBOOK_APP_ID)
}

export function lineOAuthCallbackUrl(): string | null {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
  if (!base) return null
  return `${base.replace(/\/$/, '')}/functions/v1/line-oauth-callback`
}

export function buildLineOAuthState(): string {
  const payload = { n: crypto.randomUUID(), r: getAppOrigin() }
  const state = btoa(JSON.stringify(payload))
  sessionStorage.setItem(LINE_OAUTH_STATE_KEY, state)
  return state
}

export function consumeStoredLineOAuthState(): string | null {
  const state = sessionStorage.getItem(LINE_OAUTH_STATE_KEY)
  sessionStorage.removeItem(LINE_OAUTH_STATE_KEY)
  return state
}

export function persistLineConnection(userId: string, displayName?: string) {
  sessionStorage.setItem(LINE_USER_KEY, userId)
  if (displayName) sessionStorage.setItem(LINE_NAME_KEY, displayName)
}

export function readLineConnection(): { userId: string; displayName: string | null } | null {
  const userId = sessionStorage.getItem(LINE_USER_KEY)
  if (!userId) return null
  return {
    userId,
    displayName: sessionStorage.getItem(LINE_NAME_KEY),
  }
}

export function clearLineConnection() {
  sessionStorage.removeItem(LINE_USER_KEY)
  sessionStorage.removeItem(LINE_NAME_KEY)
}

export function persistFacebookConnection(psid: string, name?: string) {
  sessionStorage.setItem(FB_PSID_KEY, psid)
  if (name) sessionStorage.setItem(FB_NAME_KEY, name)
}

export function readFacebookConnection(): { psid: string; name: string | null } | null {
  const psid = sessionStorage.getItem(FB_PSID_KEY)
  if (!psid) return null
  return { psid, name: sessionStorage.getItem(FB_NAME_KEY) }
}

export function clearFacebookConnection() {
  sessionStorage.removeItem(FB_PSID_KEY)
  sessionStorage.removeItem(FB_NAME_KEY)
}

export function lineAddFriendUrl(): string {
  const handle = LINE_OA_ID.startsWith('@') ? LINE_OA_ID : `@${LINE_OA_ID}`
  return `https://line.me/R/ti/p/${encodeURIComponent(handle)}`
}
