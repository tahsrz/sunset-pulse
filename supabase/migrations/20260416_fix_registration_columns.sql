-- Migration: Ensure public.profiles has all necessary columns and trigger is robust
-- This fixes the "database error saving new user" which occurs when a trigger fails or columns are missing

-- 1. Ensure all columns exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS license_id TEXT,
ADD COLUMN IF NOT EXISTS custom_keybind TEXT DEFAULT 'P';

-- 2. Update the handle_new_user trigger to be extremely robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_role user_role;
BEGIN
  -- Extract Full Name with multiple fallbacks
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name',
    'Operative'
  );

  -- Extract Username with multiple fallbacks
  v_username := COALESCE(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Extract Avatar with multiple fallbacks
  v_avatar_url := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  -- Safe Role Casting
  BEGIN
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'consumer'::user_role;
  END;

  -- Atomic Upsert into Profiles
  INSERT INTO public.profiles (
    id, 
    email, 
    username, 
    full_name, 
    avatar_url, 
    role, 
    custom_keybind, 
    license_id
  )
  VALUES (
    new.id, 
    new.email, 
    v_username, 
    v_full_name,
    v_avatar_url,
    v_role,
    COALESCE(new.raw_user_meta_data->>'custom_keybind', 'P'),
    new.raw_user_meta_data->>'license_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    updated_at = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- CRITICAL: Never block auth.users insertion
  -- Log error context for debugging in Supabase dashboard
  RAISE WARNING 'Registration Trigger Failure for %: %', new.email, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
