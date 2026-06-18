import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

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

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Robustness fallback for Vercel/Local consistency
  if (!supabaseUrl || supabaseUrl.includes('vercel.app')) {
    supabaseUrl = 'https://xlyfhiafactxahhvikyv.supabase.co'
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = buildResponse()
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Bypass for E2E Tests / Mock Mode
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
    return response
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes and role-based redirection
  const url = new URL(request.url)
  const path = url.pathname
  const localOrchestratorRoute = path.startsWith('/admin/orchestrator') && isLocalRequest(request)

  if (user) {
    let role = null;
    try {
      // Fetch profile to check role - Wrapped in try-catch to prevent middleware crash
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && profile) {
        role = profile.role;
      }
    } catch (err) {
      console.error('[MIDDLEWARE_PROFILE_FETCH_ERROR]:', err);
    }

    // Realtor only routes
    if (path.startsWith('/dashboard') || path.startsWith('/api/leads/reengage')) {
      if (role !== 'realtor') {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profile?.role !== 'operator' && profile?.role !== 'realtor' && profile?.role !== 'admin') {
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
