-- Migration: Create Site Configuration Table
-- This table stores global branding, intelligence, and operational settings.

CREATE TABLE IF NOT EXISTS public.site_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT UNIQUE NOT NULL,
    branding JSONB DEFAULT '{
        "primaryColor": "#2563eb",
        "fontFamily": "Inter",
        "siteName": "Sunset Pulse",
        "borderRadius": "8px",
        "quadrants": {
            "topLeft": {"background": "transparent", "color": "inherit"},
            "topRight": {"background": "transparent", "color": "inherit"},
            "bottomLeft": {"background": "transparent", "color": "inherit"},
            "bottomRight": {"background": "transparent", "color": "inherit"}
        }
    }'::jsonb,
    hero JSONB DEFAULT '{
        "title": "Find Your Future Home",
        "subtitle": "Powered by Jamie AI",
        "backgroundImage": ""
    }'::jsonb,
    intelligence JSONB DEFAULT '{}'::jsonb,
    model_matrix JSONB DEFAULT '{
        "primaryModel": "llama-3.1-8b-instant",
        "reconModel": "meta-llama/llama-3.1-405b-instruct:free",
        "miniModel": "google/gemma-2-9b-it:free"
    }'::jsonb,
    operational_settings JSONB DEFAULT '{
        "minJudges": 1,
        "maxJudges": 4,
        "personalityPreset": "Aggressive"
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone can read the config
CREATE POLICY "Public read access for site_config" ON public.site_config
    FOR SELECT USING (true);

-- 2. Only realtors/admins can update the config
CREATE POLICY "Realtors can update site_config" ON public.site_config
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'realtor')
    );

-- Enable Realtime
-- alter publication supabase_realtime add table public.site_config;
