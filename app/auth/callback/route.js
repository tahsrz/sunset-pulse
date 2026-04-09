import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') // 'signup', 'invite', 'magiclink', etc.
  const next = searchParams.get('next') ?? '/auth/success'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('🔍 [AUTH_CALLBACK] Payload:', { code, token_hash, type, error });

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

  // Handle OAuth Code Exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      return response
    }
    console.error('❌ [AUTH_CALLBACK] Code exchange failed:', exchangeError.message);
  }

  // Handle Email Confirmation (OTP/Token Hash)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!verifyError) {
      return response
    }
    console.error('❌ [AUTH_CALLBACK] OTP Verification failed:', verifyError.message);
  }

  // If we have an error but the user is actually logged in, ignore the error
  // This handles cases where the link was "pre-clicked" by an email scanner
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    console.log('✅ [AUTH_CALLBACK] User already authenticated. Proceeding to success.');
    return response
  }

  // Final Fallback: Redirect to error page
  console.error('📡 [AUTH_CALLBACK] Critical Auth Failure. Redirecting to error page.');
  return NextResponse.redirect(`${origin}/auth/auth-error?message=${encodeURIComponent(error_description || 'Authentication failed')}`)
}
