-- Daily Briefings table
CREATE TABLE IF NOT EXISTS public.daily_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    timestamp TEXT,
    simulated_research_hours INTEGER,
    daily_joke TEXT,
    news_articles JSONB,
    consolidated_truth TEXT,
    ozriel_audit JSONB
);

-- Scythe Registry table
CREATE TABLE IF NOT EXISTS public.scythe_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    timestamp TEXT,
    original TEXT,
    replacement TEXT,
    rationale TEXT
);

-- Enable RLS
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scythe_registry ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "Allow public read access for daily_briefings" ON public.daily_briefings FOR SELECT USING (true);
CREATE POLICY "Allow public read access for scythe_registry" ON public.scythe_registry FOR SELECT USING (true);

-- Allow service role full access (default in Supabase, but explicit is fine)
CREATE POLICY "Allow service_role full access for daily_briefings" ON public.daily_briefings TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service_role full access for scythe_registry" ON public.scythe_registry TO service_role USING (true) WITH CHECK (true);
