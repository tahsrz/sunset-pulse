-- FIX LEADS TABLE SCHEMA
-- Add missing reengagement_hook and fix sttage typo

DO $$ 
BEGIN 
    -- 1. Add reengagement_hook if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='reengagement_hook') THEN
        ALTER TABLE public.leads ADD COLUMN reengagement_hook JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Rename sttage to stage if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='sttage') THEN
        ALTER TABLE public.leads RENAME COLUMN sttage TO stage;
    END IF;

    -- 3. Add last_activity if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='last_activity') THEN
        ALTER TABLE public.leads ADD COLUMN last_activity TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;
