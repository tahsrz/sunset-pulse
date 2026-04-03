-- 1. Create Intelligence Events Table (The "Past" Log)
CREATE TABLE IF NOT EXISTS public.intelligence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- e.g., 'LEAD_STAGE_SHIFT', 'COLLECTION_SYNC', 'SPATIAL_INTEL', 'SPRINT_ENGAGED'
    actor_id TEXT, -- User ID or 'JAMIE-01'
    actor_name TEXT,
    target_id TEXT, -- Lead ID, Property ID, or Task ID
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    severity TEXT DEFAULT 'INFO', -- INFO, WARN, CRITICAL, TACTICAL
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for the timeline feed
-- alter publication supabase_realtime add table public.intelligence_events;

-- 2. Helper function to log events easily via RPC if needed
CREATE OR REPLACE FUNCTION public.log_intelligence_event(
    p_type TEXT,
    p_description TEXT,
    p_actor_id TEXT DEFAULT NULL,
    p_actor_name TEXT DEFAULT NULL,
    p_target_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_severity TEXT DEFAULT 'INFO'
) RETURNS UUID LANGUAGE plpgsql AS $$
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
