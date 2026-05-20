import { createClient } from '@/utils/supabase/server';
import { isNextDynamicServerUsage } from '@/lib/core/nextDynamicError';

/**
 * MIGRATION_NOTE: Transitioned from NextAuth to Supabase Auth.
 * This function now returns the Supabase user profile joined with roles.
 */
export const getSessionUser = async () => {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Fetch the profile for role and other metadata
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[AUTH_CORE] Profile fetch failed:', profileError.message);
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
