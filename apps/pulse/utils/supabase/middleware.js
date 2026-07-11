import { NextResponse } from 'next/server'

const SUPABASE_AUTH_COOKIE_PREFIX = 'sb-'
const SUPABASE_AUTH_COOKIE_SUFFIX = '-auth-token'
const BASE64_COOKIE_PREFIX = 'base64-'

export async function updateSession(request, createResponse) {
  const buildResponse = () => {
    if (createResponse) {
      return createResponse()
    }

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }

  let response = buildResponse()

  // Bypass for E2E Tests / Mock Mode
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return response
  }

  const supabaseConfig = getSupabaseConfig()
  const session = readSupabaseSession(request, supabaseConfig.url)
  const user = await getSupabaseUser(session?.access_token, supabaseConfig)

  // Protected routes and role-based redirection
  const url = new URL(request.url)
  const path = url.pathname
  const localOrchestratorRoute = path.startsWith('/admin/orchestrator') && isLocalRequest(request)
  const needsRole =
    path.startsWith('/dashboard') ||
    path.startsWith('/api/leads/reengage') ||
    path.startsWith('/abidan/war-room')
  let userRole = null

  if (user) {
    userRole = needsRole ? await getSupabaseProfileRole(user.id, session?.access_token, supabaseConfig) : null

    // Realtor only routes
    if (path.startsWith('/dashboard') || path.startsWith('/api/leads/reengage')) {
      if (userRole !== 'realtor') {
        return NextResponse.redirect(new URL('/properties', request.url))
      }
    }
  } else {
    // Redirect from protected paths to login
    if (
      path.startsWith('/collections') || 
      path.startsWith('/profile') || 
      path.startsWith('/dashboard') ||
      path.startsWith('/abidan/war-room') ||
      path.startsWith('/scythe') ||
      path.startsWith('/briefing') ||
      (path.startsWith('/admin') && !localOrchestratorRoute && !path.startsWith('/admin/scheduling'))
    ) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Role-based access for the War Room (Operator role required)
  if (user && path.startsWith('/abidan/war-room')) {
    if (userRole !== 'operator' && userRole !== 'realtor' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/properties', request.url))
    }
  }

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response
}

function getSupabaseConfig() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

  // Robustness fallback for Vercel/Local consistency
  if (!url || url.includes('vercel.app')) {
    url = 'https://xlyfhiafactxahhvikyv.supabase.co'
  }

  return { url, key }
}

function readSupabaseSession(request, supabaseUrl) {
  const cookieName = getSupabaseAuthCookieName(supabaseUrl)
  const cookieValue = combineCookieChunks(request, cookieName)
  if (!cookieValue) return null

  const decoded = decodeSupabaseCookieValue(cookieValue)
  if (!decoded) return null

  try {
    const parsed = JSON.parse(decoded)
    if (typeof parsed?.access_token === 'string') return parsed
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return { access_token: parsed[0], refresh_token: parsed[1] }
    }
  } catch {
    return null
  }

  return null
}

function getSupabaseAuthCookieName(supabaseUrl) {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef) return `${SUPABASE_AUTH_COOKIE_PREFIX}${projectRef}${SUPABASE_AUTH_COOKIE_SUFFIX}`
  } catch {}

  return 'supabase.auth.token'
}

function combineCookieChunks(request, cookieName) {
  const direct = request.cookies.get(cookieName)?.value
  if (direct) return direct

  const chunks = []
  for (let index = 0; index < 8; index += 1) {
    const chunk = request.cookies.get(`${cookieName}.${index}`)?.value
    if (!chunk) break
    chunks.push(chunk)
  }

  return chunks.length > 0 ? chunks.join('') : null
}

function decodeSupabaseCookieValue(value) {
  if (!value.startsWith(BASE64_COOKIE_PREFIX)) return value

  try {
    return decodeBase64Url(value.slice(BASE64_COOKIE_PREFIX.length))
  } catch {
    return null
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function getSupabaseUser(accessToken, supabaseConfig) {
  if (!accessToken || !supabaseConfig.key || supabaseConfig.key === 'placeholder-key') return null

  try {
    const response = await fetch(`${supabaseConfig.url}/auth/v1/user`, {
      headers: {
        apikey: supabaseConfig.key,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) return null
    return await response.json()
  } catch (err) {
    console.error('[MIDDLEWARE_USER_FETCH_ERROR]:', err)
    return null
  }
}

async function getSupabaseProfileRole(userId, accessToken, supabaseConfig) {
  if (!userId || !accessToken || !supabaseConfig.key || supabaseConfig.key === 'placeholder-key') return null

  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}`, {
      headers: {
        apikey: supabaseConfig.key,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) return null
    const profiles = await response.json()
    return Array.isArray(profiles) ? profiles[0]?.role ?? null : profiles?.role ?? null
  } catch (err) {
    console.error('[MIDDLEWARE_PROFILE_FETCH_ERROR]:', err)
    return null
  }
}

function isLocalRequest(request) {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  const urlHost = request.nextUrl?.hostname
  const headerHost = request.headers.get('host') || ''
  const candidates = [urlHost, normalizeHost(headerHost)]
    .filter(Boolean)
    .map((host) => host.toLowerCase())

  return candidates.some(isDevelopmentHost)
}

function normalizeHost(host) {
  if (!host) return ''
  if (host.startsWith('[')) {
    const closeIndex = host.indexOf(']')
    return closeIndex === -1 ? host : host.slice(1, closeIndex)
  }

  return host.split(':')[0]
}

function isDevelopmentHost(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true
  }

  if (hostname === '0.0.0.0' || hostname.endsWith('.local')) {
    return true
  }

  return isPrivateIpv4(hostname) || isPrivateIpv6(hostname)
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [first, second] = parts
  return first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
}

function isPrivateIpv6(hostname) {
  if (!hostname.includes(':') || !/^[0-9a-f:]+$/.test(hostname)) {
    return false
  }

  const firstHextet = Number.parseInt(hostname.split(':')[0], 16)
  if (!Number.isFinite(firstHextet)) {
    return false
  }

  return (firstHextet & 0xfe00) === 0xfc00 || (firstHextet & 0xffc0) === 0xfe80
}
