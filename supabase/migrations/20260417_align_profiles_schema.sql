-- Migration: Final Schema Alignment for Profiles
-- Adds missing columns used by frontend components to prevent 406/500 errors

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_advanced_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_name TEXT; -- Maintaining as alias for username if needed

-- Sync username and user_name if both exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='user_name') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
    UPDATE public.profiles SET username = COALESCE(username, user_name), user_name = COALESCE(user_name, username);
  END IF;
END $$;
