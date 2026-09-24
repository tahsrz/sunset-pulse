-- Keep Auth user creation compatible with the original profiles.email
-- NOT NULL contract. Later profile metadata migrations replaced the trigger
-- function without carrying that required column forward.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        username,
        avatar_url,
        role,
        license_id,
        is_subscribed,
        is_advanced_mode,
        custom_keybind,
        brokerage_name,
        brokerage_license,
        brokerage_email,
        brokerage_phone,
        designated_broker,
        designated_broker_license,
        supervisor,
        supervisor_license,
        phone_number
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, NEW.phone, NEW.id::TEXT || '@local.invalid'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, NEW.phone, NEW.id::TEXT), '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'user_name', split_part(COALESCE(NEW.email, NEW.phone, NEW.id::TEXT), '@', 1)) || '-' || substring(NEW.id::TEXT from 1 for 8),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'consumer'),
        NEW.raw_user_meta_data->>'license_id',
        COALESCE(lower(NULLIF(NEW.raw_user_meta_data->>'isSubscribed', '')) = 'true', false),
        COALESCE((NEW.raw_user_meta_data->>'role') = 'realtor', false),
        'P',
        NEW.raw_user_meta_data->>'brokerage_name',
        NEW.raw_user_meta_data->>'brokerage_license',
        NEW.raw_user_meta_data->>'brokerage_email',
        NEW.raw_user_meta_data->>'brokerage_phone',
        NEW.raw_user_meta_data->>'designated_broker',
        NEW.raw_user_meta_data->>'designated_broker_license',
        NEW.raw_user_meta_data->>'supervisor',
        NEW.raw_user_meta_data->>'supervisor_license',
        NEW.raw_user_meta_data->>'phone_number'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url,
        role = EXCLUDED.role,
        license_id = EXCLUDED.license_id,
        is_subscribed = EXCLUDED.is_subscribed,
        is_advanced_mode = EXCLUDED.is_advanced_mode,
        brokerage_name = EXCLUDED.brokerage_name,
        brokerage_license = EXCLUDED.brokerage_license,
        brokerage_email = EXCLUDED.brokerage_email,
        brokerage_phone = EXCLUDED.brokerage_phone,
        designated_broker = EXCLUDED.designated_broker,
        designated_broker_license = EXCLUDED.designated_broker_license,
        supervisor = EXCLUDED.supervisor,
        supervisor_license = EXCLUDED.supervisor_license,
        phone_number = EXCLUDED.phone_number;

    RETURN NEW;
END;
$$;
