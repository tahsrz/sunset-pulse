import { createClient } from '@/utils/supabase/server';
import { isNextDynamicServerUsage } from '@/lib/core/nextDynamicError';
import { cookies } from 'next/headers';
import {
  MOCK_SESSION_COOKIE,
  mockSessionsEnabled,
  readMockSession,
  toSessionUser
} from '@/lib/core/mockSessionStore';

/**
 * MIGRATION_NOTE: Transitioned from NextAuth to Supabase Auth.
 * This function now returns the Supabase user profile joined with roles.
 */
export const getSessionUser = async () => {
  try {
    if (mockSessionsEnabled()) {
      const cookieStore = await cookies();
      const mockSession = readMockSession(cookieStore.get(MOCK_SESSION_COOKIE)?.value);
      if (mockSession) return toSessionUser(mockSession);
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Fetch the profile for role and other metadata
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('avatar_url, full_name, role, is_subscribed, custom_keybind')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[AUTH_CORE] Profile fetch failed:', profileError.message);
      return null;
    }

    const metadata = user.user_metadata || {};
    const image = profile?.avatar_url || metadata.avatar_url || metadata.picture || metadata.photo_url || null;
    const name = profile?.full_name || metadata.full_name || metadata.name || user.email.split('@')[0];

    return {
      user: {
        ...user,
        name,
        image,
        role: profile?.role || 'consumer',
        isAdvancedMode: profile?.role === 'realtor', 
        isSubscribed: profile?.role === 'realtor' || !!profile?.is_subscribed,
        customKeybind: profile?.custom_keybind || 'P'
      },
      userId: user.id,
      email: user.email,
      role: profile?.role || 'consumer'
    };
  } catch (error) {
    if (isNextDynamicServerUsage(error)) {
      return null;
    }

    console.error('[AUTH_CORE] Session retrieval critical failure:', error);
    return null;
  }
};
