/**
 * LINE Login OAuth callback — แลก code เป็น profile แล้ว redirect กลับ /contact
 * Secrets (Supabase Dashboard → Edge Functions): LINE_CHANNEL_ID, LINE_CHANNEL_SECRET
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthStatePayload {
  n: string
  r: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function redirectError(returnOrigin: string, message: string) {
  const url = new URL('/contact', returnOrigin)
  url.searchParams.set('line_error', message)
  return Response.redirect(url.toString(), 302)
}

function parseState(raw: string | null): OAuthStatePayload | null {
  if (!raw?.trim()) return null
  try {
    const decoded = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(decoded) as OAuthStatePayload
    if (!parsed?.n || !parsed?.r) return null
    const origin = new URL(parsed.r)
    if (origin.protocol !== 'http:' && origin.protocol !== 'https:') return null
    return { n: String(parsed.n), r: origin.origin }
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const state = parseState(stateRaw)
  const returnOrigin = state?.r ?? Deno.env.get('CONTACT_OAUTH_RETURN_ORIGIN') ?? 'https://app.npcreate.co.th'

  if (oauthError) {
    return redirectError(returnOrigin, oauthError)
  }

  if (!code || !state) {
    return redirectError(returnOrigin, 'invalid_state')
  }

  const channelId = Deno.env.get('LINE_CHANNEL_ID')?.trim()
  const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')?.trim()
  if (!channelId || !channelSecret) {
    return redirectError(returnOrigin, 'server_not_configured')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
  if (!supabaseUrl) {
    return redirectError(returnOrigin, 'server_not_configured')
  }

  const redirectUri = `${supabaseUrl}/functions/v1/line-oauth-callback`

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  })

  if (!tokenRes.ok) {
    console.error('LINE token error', await tokenRes.text())
    return redirectError(returnOrigin, 'token_exchange_failed')
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  const accessToken = tokenJson.access_token
  if (!accessToken) {
    return redirectError(returnOrigin, 'no_access_token')
  }

  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!profileRes.ok) {
    console.error('LINE profile error', await profileRes.text())
    return redirectError(returnOrigin, 'profile_failed')
  }

  const profile = (await profileRes.json()) as {
    userId?: string
    displayName?: string
    pictureUrl?: string
  }

  if (!profile.userId) {
    return redirectError(returnOrigin, 'no_user_id')
  }

  const redirectTo = new URL('/contact', returnOrigin)
  redirectTo.searchParams.set('line_connected', '1')
  redirectTo.searchParams.set('line_user_id', profile.userId)
  if (profile.displayName) {
    redirectTo.searchParams.set('line_name', profile.displayName)
  }

  return Response.redirect(redirectTo.toString(), 302)
})
