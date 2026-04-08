-- Migration: Fix OAuth handle_new_user trigger
-- Specifically handles the metadata differences between Google OAuth and standard sign-ups

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- 1. Extract Full Name (Google uses 'full_name' or 'name')
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name'
  );

  -- 2. Extract Username (Google uses 'name' or 'user_name')
  v_username := COALESCE(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1) -- Fallback to email prefix
  );

  -- 3. Extract Avatar (Google uses 'picture' or 'avatar_url')
  v_avatar_url := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  -- 4. Safe Insert with On Conflict (just in case of race conditions)
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
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'consumer'),
    COALESCE(new.raw_user_meta_data->>'custom_keybind', 'P'),
    new.raw_user_meta_data->>'license_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error to Postgres log and continue (to prevent blocking auth.users insert)
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
