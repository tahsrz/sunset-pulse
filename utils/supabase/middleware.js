import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes and role-based redirection
  const url = new URL(request.url)
  const path = url.pathname

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
    if (path.startsWith('/command-post') || path.startsWith('/api/leads/reengage')) {
      if (role !== 'realtor') {
        return NextResponse.redirect(new URL('/properties', request.url))
      }
    }
  } else {
    // Redirect from protected paths to login
    if (
      path.startsWith('/collections') || 
      path.startsWith('/profile') || 
      path.startsWith('/command-post') ||
      path.startsWith('/abidan/war-room') ||
      path.startsWith('/scythe') ||
      path.startsWith('/briefing') ||
      path.startsWith('/admin')
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
