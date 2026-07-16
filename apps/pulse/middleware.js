import { NextResponse } from 'next/server'
import { getTenantRewrite } from '@/lib/sites/tenantRouting'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request) {
  const url = new URL(request.url)
  const path = url.pathname
  const code = url.searchParams.get('code')
  const token_hash = url.searchParams.get('token_hash')

  if (path === '/admin/branding') {
    return NextResponse.redirect(new URL('/admin/launch-kit', request.url))
  }

  // Seamless Supabase auth fallback: if an auth code or token_hash lands on any route other
  // than the callback, redirect them to /auth/callback to establish and persist their session.
  if ((code || token_hash) && path !== '/auth/callback' && !path.startsWith('/api/') && !path.startsWith('/_next/')) {
    const callbackUrl = new URL('/auth/callback', request.url)
    url.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    console.log(`[MIDDLEWARE] Redirecting auth parameters from path "${path}" to /auth/callback...`)
    return NextResponse.redirect(callbackUrl)
  }

  const tenantRewrite = getTenantRewrite(request)

  if (tenantRewrite) {
    return await updateSession(request, () => {
      const requestHeaders = getForwardedRequestHeaders(request)
      requestHeaders.set('x-sunset-tenant', tenantRewrite.tenant)
      requestHeaders.set('x-sunset-tenant-host', tenantRewrite.hostname)

      return NextResponse.rewrite(tenantRewrite.url, {
        request: {
          headers: requestHeaders,
        },
      })
    })
  }

  return await updateSession(request, () => NextResponse.next({
    request: {
      headers: getForwardedRequestHeaders(request),
    },
  }))
}

function getForwardedRequestHeaders(request) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-sunset-tenant')
  requestHeaders.delete('x-sunset-tenant-host')
  return requestHeaders
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * Include more paths by editing this file.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
