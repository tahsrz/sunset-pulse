import { NextResponse } from 'next/server'
import { getTenantRewrite } from '@/lib/sites/tenantRouting'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request) {
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
