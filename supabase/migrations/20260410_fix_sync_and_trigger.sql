-- Migration: Fix trigger and add missing sync columns
-- 1. Add reengagement_hook column to public.leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS reengagement_hook JSONB DEFAULT '{}'::jsonb;

-- 2. Update handle_new_user trigger to include full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    username, 
    full_name, -- Added missing column
    avatar_url, 
    role, 
    custom_keybind, 
    license_id
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'user_name', 
    new.raw_user_meta_data->>'full_name', -- Added missing value
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'consumer'),
    COALESCE(new.raw_user_meta_data->>'custom_keybind', 'P'),
    new.raw_user_meta_data->>'license_id'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update initialize_workflow to be SECURITY DEFINER
-- This allows Jamie (via RPC) to inject workflows regardless of user's RLS permissions 
-- (while ensuring it's only called when we expect it to be).
ALTER FUNCTION public.initialize_workflow(TEXT, TEXT, JSONB, JSONB) SECURITY DEFINER;
