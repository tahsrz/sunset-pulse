-- Enable Realtime for these tables
-- Run this in the Supabase SQL Editor to allow Jamie to stream updates to the UI
-- alter publication supabase_realtime add table public.workflows;
-- alter publication supabase_realtime add table public.tasks;

-- 1. Create Workflows Table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_goal TEXT,
    status TEXT DEFAULT 'pending', -- pending, active, completed, archived
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Create Sprints Table (A workflow can have multiple sprints)
CREATE TABLE IF NOT EXISTS public.sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_duration_hours NUMERIC,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID REFERENCES public.sprints(id) ON DELETE CASCADE,
    task_id_alias TEXT, -- Short ID from Jamie (e.g., 'recon-01')
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER,
    api_endpoint TEXT,
    priority TEXT, -- Low, Medium, High, Critical
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Initialize Workflow RPC
-- This function wraps multiple inserts into a single transaction.
CREATE OR REPLACE FUNCTION public.initialize_workflow(
    p_name TEXT,
    p_business_goal TEXT,
    p_sprint_data JSONB, -- The structured JSON from Jamie
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_workflow_id UUID;
    v_sprint_id UUID;
    v_task JSONB;
    v_result JSONB;
BEGIN
    -- Insert Workflow
    INSERT INTO public.workflows (name, business_goal, metadata)
    VALUES (p_name, p_business_goal, p_metadata)
    RETURNING id INTO v_workflow_id;

    -- Insert Sprint
    INSERT INTO public.sprints (workflow_id, name, total_duration_hours, status)
    VALUES (
        v_workflow_id, 
        p_sprint_data->>'sprint_name', 
        (p_sprint_data->>'total_duration_hours')::NUMERIC,
        'active'
    )
    RETURNING id INTO v_sprint_id;

    -- Insert Tasks from JSON array
    FOR v_task IN SELECT * FROM jsonb_array_elements(p_sprint_data->'tasks')
    LOOP
        INSERT INTO public.tasks (
            sprint_id, 
            task_id_alias, 
            title, 
            description, 
            duration_minutes, 
            api_endpoint, 
            priority, 
            status
        )
        VALUES (
            v_sprint_id,
            v_task->>'task_id',
            v_task->>'title',
            v_task->>'description',
            (v_task->>'duration_minutes')::INTEGER,
            v_task->>'api_endpoint',
            v_task->>'priority',
            v_task->>'status'
        );
    END LOOP;

    -- Update Workflow to active
    UPDATE public.workflows SET status = 'active' WHERE id = v_workflow_id;

    SELECT jsonb_build_object(
        'workflow_id', v_workflow_id,
        'sprint_id', v_sprint_id,
        'status', 'initialized'
    ) INTO v_result;

    RETURN v_result;
END;
$$;
