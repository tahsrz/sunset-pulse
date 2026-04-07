-- Add lefthand mode preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_lefthand_mode BOOLEAN DEFAULT FALSE;

-- Update the handle_new_user trigger to include this field from metadata
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
    license_id,
    is_lefthand_mode
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'user_name', 
    new.raw_user_meta_data->>'avatar_url',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'consumer'),
    COALESCE(new.raw_user_meta_data->>'custom_keybind', 'P'),
    new.raw_user_meta_data->>'license_id',
    COALESCE((new.raw_user_meta_data->>'isLefthandMode')::BOOLEAN, FALSE)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
