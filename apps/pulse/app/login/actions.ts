'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { buildAuthCallbackUrl, sanitizeAuthNext } from '@/lib/core/auth_redirect';
import type { OptimisticMutationState } from '@/lib/forms/optimisticMutation';

export async function signInWithEmail(
  _previousState: OptimisticMutationState,
  formData: FormData
): Promise<OptimisticMutationState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = sanitizeAuthNext(String(formData.get('next') || '/'));

  if (!email || !password) {
    return {
      status: 'error',
      message: 'Email and password are required.'
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return {
      status: 'error',
      message: error.message || 'Sign in failed. Check your credentials and try again.'
    };
  }

  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const next = sanitizeAuthNext(String(formData.get('next') || '/auth/success'));
  const supabase = createClient();
  const origin = await getServerAuthOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildAuthCallbackUrl(origin, next)
    }
  });

  if (error || !data.url) {
    const message = encodeURIComponent(error?.message || 'Google sign in failed.');
    redirect(`/auth/auth-error?message=${message}`);
  }

  redirect(data.url);
}

async function getServerAuthOrigin() {
  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredOrigin && !configuredOrigin.includes('vercel.app')) {
    return configuredOrigin.replace(/\/+$/, '');
  }

  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
  const proto = requestHeaders.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

  return `${proto}://${host}`;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}


