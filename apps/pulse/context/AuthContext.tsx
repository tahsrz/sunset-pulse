'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  is_subscribed?: boolean;
  [key: string]: any;
}

export interface AuthUser extends User {
  profile?: Profile | null;
  user_metadata: {
    avatar_url?: string;
    full_name?: string;
    role?: string;
    isSubscribed?: boolean;
    [key: string]: any;
  };
}

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => ({ error: null }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (authUser: User) => {
    // Using empty select() and maybeSingle() to bypass potential library concatenation bugs
    const { data: profile, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (error) {
      console.error('[AUTH_CONTEXT] Profile fetch error:', error.message);
      const fallbackAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || authUser.user_metadata?.photo_url;
      // Fallback logic
      setUser({
        ...authUser,
        profile: null,
        user_metadata: {
          ...authUser.user_metadata,
          avatar_url: fallbackAvatar,
          role: authUser.user_metadata?.role || 'consumer',
          isSubscribed: authUser.user_metadata?.isSubscribed || false
        }
      });
      setLoading(false);
      return;
    }

    const profileAvatar = (profile as any)?.avatar_url;
    const metadataAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || authUser.user_metadata?.photo_url;
    const profileName = (profile as any)?.full_name;
    const metadataName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.user_name;

    const enrichedUser: AuthUser = {
      ...authUser,
      profile: profile as Profile,
      user_metadata: {
        ...authUser.user_metadata,
        avatar_url: profileAvatar || metadataAvatar,
        full_name: profileName || metadataName,
        role: (profile as any)?.role || authUser.user_metadata?.role || 'consumer',
        isSubscribed: (profile as any)?.role === 'realtor' || !!(profile as any)?.is_subscribed || !!authUser.user_metadata?.isSubscribed
      }
    };
    setUser(enrichedUser);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      const getMockSession = async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/auth/session', { cache: 'no-store' });
          const body = await response.json();
          if (!isMounted) return;

          if (body?.authenticated && body.user) {
            const authUser = mockAuthUser(body.user);
            setUser(authUser);
            setSession(mockAuthSession(authUser));
          } else {
            setUser(null);
            setSession(null);
          }
        } catch (error) {
          console.error('[AUTH_CONTEXT] Mock session fetch error:', error);
          if (isMounted) {
            setUser(null);
            setSession(null);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      getMockSession();

      return () => {
        isMounted = false;
      };
    }

    // Check active sessions and sets the user
    const getSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    getSession();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    session,
    user,
    loading,
    signOut: async () => {
      if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
        await fetch('/api/auth/session', { method: 'DELETE', cache: 'no-store' });
        setSession(null);
        setUser(null);
        return { error: null };
      }

      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function mockAuthUser(user: any): AuthUser {
  const metadata = {
    ...(user.user_metadata || {}),
    avatar_url: user.image || user.user_metadata?.avatar_url,
    full_name: user.name || user.user_metadata?.full_name,
    role: user.role || user.user_metadata?.role || 'consumer',
    isSubscribed: Boolean(user.isSubscribed || user.user_metadata?.isSubscribed),
  };

  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: metadata,
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    profile: {
      id: user.id,
      full_name: user.name,
      avatar_url: user.image,
      role: metadata.role,
      is_subscribed: metadata.isSubscribed,
    },
  } as AuthUser;
}

function mockAuthSession(user: AuthUser): Session {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 60 * 60 * 24 * 7,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    token_type: 'bearer',
    user,
  };
}
