-- Migration: 20260408_market_anomaly_sync
-- Purpose: Align leads table with Command Post and Market Anomaly Alert requirements.

-- 1. Add location_interest for targeted market anomaly matching
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS location_interest TEXT;

-- 2. Add lead_category (Residential, RV, Commercial) as seen in StrategicOverview
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_category TEXT DEFAULT 'Residential';

-- 3. Add reengagement_hook if not already present (checking for idempotency)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS reengagement_hook JSONB DEFAULT '{}'::jsonb;

-- 4. Index for performance on anomaly matching
CREATE INDEX IF NOT EXISTS idx_leads_location_interest ON public.leads (location_interest);

-- 5. Add a status column if it doesn't exist (used in LeadIntelligenceGrid filters)
-- Note: 'stage' exists as an enum, but 'status' is used in the UI filters ('New', 'Contacted').
-- We'll add 'status' as a text column to match the UI's flexible filtering.
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New';

COMMENT ON COLUMN public.leads.location_interest IS 'Primary neighborhood or city the lead is monitoring for tactical entry.';
COMMENT ON COLUMN public.leads.lead_category IS 'The asset class: Residential, RV, or Commercial.';
