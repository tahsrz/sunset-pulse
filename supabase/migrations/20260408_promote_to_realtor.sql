-- Function to promote a user to realtor by email
-- This can be called via RPC with service_role or by another realtor
CREATE OR REPLACE FUNCTION public.promote_user_to_realtor(p_email TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Check if the caller is a realtor (Skip if using service role)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'realtor'
    ) AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Insufficient clearance for role elevation.';
    END IF;

    -- 2. Find the user ID by email
    SELECT id INTO v_user_id FROM public.profiles WHERE email = p_email;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found in the grid.');
    END IF;

    -- 3. Update the role
    UPDATE public.profiles 
    SET role = 'realtor', updated_at = now()
    WHERE id = v_user_id;

    -- 4. Log the event to THE_PAST
    PERFORM public.log_intelligence_event(
        'ROLE_ELEVATION',
        'User ' || p_email || ' elevated to REALTOR role.',
        COALESCE(auth.uid()::text, 'SYSTEM'),
        'JAMIE-ADMIN',
        v_user_id::text,
        jsonb_build_object('email', p_email, 'new_role', 'realtor'),
        'CRITICAL'
    );

    RETURN jsonb_build_object('success', true, 'message', 'User ' || p_email || ' promoted to Realtor.');
END;
$$;
