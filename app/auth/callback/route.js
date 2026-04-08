import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('🔍 [AUTH_CALLBACK] Search Params:', Object.fromEntries(searchParams.entries()));

  if (error) {
    console.error('❌ [AUTH_CALLBACK] Google returned an error:', error, error_description);
  }

  if (code) {
    console.log('🔄 [AUTH_CALLBACK] Exchanging code for session...');
    const response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      console.log('✅ [AUTH_CALLBACK] Session established. Redirecting to success page.');
      return NextResponse.redirect(`${origin}/auth/success`)
    }

    console.error('❌ [AUTH_CALLBACK] Exchange failed:', error.message);
  } else {
    console.warn('⚠️ [AUTH_CALLBACK] No code found in search params.');
  }

  // return user to an error page with instructions
  console.log('📡 [AUTH_CALLBACK] Redirecting to error page.');
  return NextResponse.redirect(`${origin}/auth/auth-error`)
}
