import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sanitizeAuthNext } from '@/lib/core/auth_redirect'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = sanitizeAuthNext(searchParams.get('next'))
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  console.log('[AUTH_CALLBACK] Payload:', { code, token_hash, type, error })

  const response = NextResponse.redirect(`${origin}${next}`)

  const redirectToLoginError = (message) => {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', message)
    loginUrl.searchParams.set('redirect', next)
    return NextResponse.redirect(loginUrl)
  }

  if (error || error_description) {
    console.warn('[AUTH_CALLBACK] Provider returned an error:', {
      error,
      description: error_description,
    })
    return redirectToLoginError(error_description || error || 'Authentication failed')
  }

  if (!code && !token_hash) {
    console.warn('[AUTH_CALLBACK] Missing auth parameters. Redirecting to login for a fresh attempt.')
    return redirectToLoginError('missing-auth-params')
  }

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // Robustness fallback for Vercel/Local consistency
  if (!url || url.includes('vercel.app')) {
    url = 'https://xlyfhiafactxahhvikyv.supabase.co'
  }

  const supabase = createServerClient(
    url,
    key || 'placeholder-key',
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
    const avatarUrl = metadata.avatar_url || metadata.picture || metadata.photo_url || null
    const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Sunset Pulse User'
    const profileClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        })
      : supabase

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      username: `${metadata.username || metadata.user_name || user.email?.split('@')[0] || 'user'}-${user.id.slice(0, 8)}`,
      avatar_url: avatarUrl,
      role,
      license_id: metadata.license_id || null,
      is_subscribed: role === 'realtor' || !!metadata.isSubscribed,
      is_advanced_mode: role === 'realtor',
      brokerage_name: metadata.brokerage_name || null,
      brokerage_license: metadata.brokerage_license || null,
      brokerage_email: metadata.brokerage_email || null,
      brokerage_phone: metadata.brokerage_phone || null,
      designated_broker: metadata.designated_broker || null,
      designated_broker_license: metadata.designated_broker_license || null,
      supervisor: metadata.supervisor || null,
      supervisor_license: metadata.supervisor_license || null,
      phone_number: metadata.phone_number || null,
    }

    const { data: profile, error: profileError } = await profileClient
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
        await profileClient
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
    return redirectToLoginError(exchangeError.message || 'Authentication failed')
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
    return redirectToLoginError(verifyError.message || 'Authentication failed')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await ensureProfile()
    console.log('[AUTH_CALLBACK] User already authenticated. Proceeding to success.')
    return response
  }

  return redirectToLoginError('Authentication failed')
}
