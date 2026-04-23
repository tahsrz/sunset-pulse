-- Migration: Fix Intelligence Logging RLS (V2 - Clean Slate)
-- Description: Drops and recreates log_intelligence_event as a SECURITY DEFINER function
-- to ensure no signature conflicts and allow autonomous logging.

-- 1. Drop existing function to prevent signature/overload conflicts
DROP FUNCTION IF EXISTS public.log_intelligence_event(text, text, text, text, text, jsonb, text);

-- 2. Recreate with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_intelligence_event(
    p_type TEXT,
    p_description TEXT,
    p_actor_id TEXT DEFAULT NULL,
    p_actor_name TEXT DEFAULT NULL,
    p_target_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_severity TEXT DEFAULT 'INFO'
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO public.intelligence_events (
        event_type, description, actor_id, actor_name, target_id, metadata, severity
    )
    VALUES (
        p_type, p_description, p_actor_id, p_actor_name, p_target_id, p_metadata, p_severity
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- 3. Explicitly grant permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_intelligence_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_intelligence_event TO anon;

-- 4. Enable RLS on the table but allow the function (owner) to bypass it
-- (Already enabled in previous migrations, this is just for safety)
ALTER TABLE public.intelligence_events ENABLE ROW LEVEL SECURITY;
