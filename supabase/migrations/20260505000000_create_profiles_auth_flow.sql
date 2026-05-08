-- Supabase Auth profile bridge
-- Creates an application profile for every Supabase Auth user and allows users
-- to read/update their own profile metadata after confirmation.

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT DEFAULT 'consumer' CHECK (role IN ('consumer', 'realtor', 'operator', 'admin')),
    license_id TEXT,
    is_subscribed BOOLEAN DEFAULT false,
    is_advanced_mode BOOLEAN DEFAULT false,
    is_lefthand_mode BOOLEAN DEFAULT false,
    custom_keybind TEXT DEFAULT 'P',
    welcome_email_sent BOOLEAN DEFAULT false
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'consumer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_advanced_mode BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_lefthand_mode BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_keybind TEXT DEFAULT 'P';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
ON public.profiles
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        username,
        avatar_url,
        role,
        license_id,
        is_subscribed,
        is_advanced_mode,
        custom_keybind
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)) || '-' || substring(NEW.id::TEXT from 1 for 8),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'consumer'),
        NEW.raw_user_meta_data->>'license_id',
        COALESCE(lower(NULLIF(NEW.raw_user_meta_data->>'isSubscribed', '')) = 'true', false),
        COALESCE((NEW.raw_user_meta_data->>'role') = 'realtor', false),
        'P'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url,
        role = EXCLUDED.role,
        license_id = EXCLUDED.license_id,
        is_subscribed = EXCLUDED.is_subscribed,
        is_advanced_mode = EXCLUDED.is_advanced_mode;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
