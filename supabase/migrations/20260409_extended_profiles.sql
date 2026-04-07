-- Migration: Add custom settings and validation fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS custom_keybind TEXT DEFAULT 'P',
ADD COLUMN IF NOT EXISTS license_id TEXT;

-- Update the handle_new_user trigger to include these fields from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    username, 
    avatar_url, 
    role, 
    custom_keybind, 
    license_id
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'user_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'consumer'),
    COALESCE(new.raw_user_meta_data->>'custom_keybind', 'P'),
    new.raw_user_meta_data->>'license_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
