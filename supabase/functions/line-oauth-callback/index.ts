/**
 * LINE Login OAuth callback
 * - GET: redirect จาก LINE (redirect_uri ชี้ edge หรือ legacy)
 * - POST: แลก code จาก /contact?code=... (redirect_uri = {origin}/contact)
 *
 * Secrets: LINE_CHANNEL_ID, LINE_CHANNEL_SECRET
 * ลงทะเบียน Callback URL ใน LINE Console:
 *   https://app.npcreate.co.th/contact
 *   http://localhost:5173/contact
 *   (+ URL edge นี้ถ้ายังใช้ legacy)
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthStatePayload {
  n: string
  r: string
}

interface TokenExchangeInput {
  code: string
  state: string
  redirect_uri?: string
}

const DEFAULT_RETURN_ORIGIN = 'https://app.npcreate.co.th'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isAllowedReturnHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  return hostname === 'app.npcreate.co.th' || hostname === 'ops.npcreate.co.th' || hostname.endsWith('.npcreate.co.th')
}

function normalizeContactReturnUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!isAllowedReturnHost(url.hostname)) return null
    if (!url.pathname.includes('contact')) {
      url.pathname = '/contact'
    }
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function parseState(raw: string | null): OAuthStatePayload | null {
  if (!raw?.trim()) return null
  try {
    const decoded = atob(raw.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(decoded) as OAuthStatePayload
    if (!parsed?.n || !parsed?.r) return null
    const returnTo = normalizeContactReturnUrl(parsed.r)
    if (!returnTo) return null
    return { n: String(parsed.n), r: returnTo }
  } catch {
    return null
  }
}

function redirectError(returnTo: string, message: string) {
  const url = new URL(returnTo)
  url.searchParams.set('line_error', message)
  return Response.redirect(url.toString(), 302)
}

async function exchangeCodeForProfile(input: TokenExchangeInput) {
  const channelId = Deno.env.get('LINE_CHANNEL_ID')?.trim()
  const channelSecret = Deno.env.get('LINE_CHANNEL_SECRET')?.trim()
  if (!channelId || !channelSecret) {
    return { error: 'server_not_configured' as const }
  }

  const state = parseState(input.state)
  if (!state) {
    return { error: 'invalid_state' as const }
  }

  const redirectUri =
    input.redirect_uri?.trim() || state.r || `${DEFAULT_RETURN_ORIGIN}/contact`

  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  })

  if (!tokenRes.ok) {
    console.error('LINE token error', await tokenRes.text())
    return { error: 'token_exchange_failed' as const, returnTo: state.r }
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  const accessToken = tokenJson.access_token
  if (!accessToken) {
    return { error: 'no_access_token' as const, returnTo: state.r }
  }

  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!profileRes.ok) {
    console.error('LINE profile error', await profileRes.text())
    return { error: 'profile_failed' as const, returnTo: state.r }
  }

  const profile = (await profileRes.json()) as {
    userId?: string
    displayName?: string
  }

  if (!profile.userId) {
    return { error: 'no_user_id' as const, returnTo: state.r }
  }

  return {
    returnTo: state.r,
    userId: profile.userId,
    displayName: profile.displayName ?? null,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as TokenExchangeInput
      const code = body.code?.trim()
      const state = body.state?.trim()
      if (!code || !state) {
        return json({ ok: false, error: 'invalid_request' }, 400)
      }

      const result = await exchangeCodeForProfile({
        code,
        state,
        redirect_uri: body.redirect_uri,
      })

      if ('error' in result) {
        return json({ ok: false, error: result.error }, 400)
      }

      return json({
        ok: true,
        user_id: result.userId,
        display_name: result.displayName,
      })
    } catch (e) {
      console.error('line-oauth-callback POST', e)
      return json({ ok: false, error: 'server_error' }, 500)
    }
  }

  if (req.method !== 'GET') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const state = parseState(stateRaw)
  const returnTo =
    state?.r ??
    normalizeContactReturnUrl(Deno.env.get('CONTACT_OAUTH_RETURN_ORIGIN') ?? DEFAULT_RETURN_ORIGIN) ??
    `${DEFAULT_RETURN_ORIGIN}/contact`

  if (oauthError) {
    return redirectError(returnTo, oauthError)
  }

  if (!code || !state) {
    return redirectError(returnTo, 'invalid_state')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')
  const edgeRedirectUri = supabaseUrl
    ? `${supabaseUrl}/functions/v1/line-oauth-callback`
    : undefined

  const result = await exchangeCodeForProfile({
    code,
    state: stateRaw!,
    redirect_uri: edgeRedirectUri,
  })

  if ('error' in result) {
    return redirectError(result.returnTo ?? returnTo, result.error)
  }

  const redirectTo = new URL(result.returnTo)
  redirectTo.searchParams.set('line_connected', '1')
  redirectTo.searchParams.set('line_user_id', result.userId)
  if (result.displayName) {
    redirectTo.searchParams.set('line_name', result.displayName)
  }

  return Response.redirect(redirectTo.toString(), 302)
})
