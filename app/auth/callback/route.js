import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/auth/success'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('[AUTH_CALLBACK] Payload:', { code, token_hash, type, error })

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

  const ensureProfile = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return null

    const metadata = user.user_metadata || {}
    const role = metadata.role || 'consumer'
    const profilePayload = {
      id: user.id,
      full_name: metadata.full_name || user.email?.split('@')[0] || 'Sunset Pulse User',
      username: `${metadata.username || metadata.user_name || user.email?.split('@')[0] || 'user'}-${user.id.slice(0, 8)}`,
      avatar_url: metadata.avatar_url || null,
      role,
      license_id: metadata.license_id || null,
      is_subscribed: role === 'realtor' || !!metadata.isSubscribed,
      is_advanced_mode: role === 'realtor',
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('welcome_email_sent')
      .single()

    if (profileError) {
      console.error('[AUTH_CALLBACK] Profile sync failed:', profileError.message)
      return user
    }

    if (!profile?.welcome_email_sent && user.email) {
      const { error: welcomeError } = await supabase.functions.invoke('welcome-email', {
        body: {
          email: user.email,
          full_name: profilePayload.full_name,
          role,
        },
      })

      if (welcomeError) {
        console.error('[AUTH_CALLBACK] Welcome email failed:', welcomeError.message)
      } else {
        await supabase
          .from('profiles')
          .update({ welcome_email_sent: true })
          .eq('id', user.id)
      }
    }

    return user
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (!exchangeError) {
      await ensureProfile()
      return response
    }
    console.error('[AUTH_CALLBACK] Code exchange failed:', exchangeError.message)
  }

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!verifyError) {
      await ensureProfile()
      return response
    }
    console.error('[AUTH_CALLBACK] OTP verification failed:', verifyError.message)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await ensureProfile()
    console.log('[AUTH_CALLBACK] User already authenticated. Proceeding to success.')
    return response
  }

  return NextResponse.redirect(`${origin}/auth/auth-error?message=${encodeURIComponent(error_description || 'Authentication failed')}`)
}
