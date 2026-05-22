-- CREATE PROPERTIES TABLE FOR SUNSET PULSE ALPHA
-- This table centralizes MLS/IDX data in the Supabase Grid.

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mls_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Residential',
    city TEXT,
    state TEXT DEFAULT 'TX',
    zip TEXT,
    beds INTEGER DEFAULT 0,
    baths INTEGER DEFAULT 0,
    sqft INTEGER DEFAULT 0,
    price NUMERIC DEFAULT 0,
    image_url TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional Tactical Metadata (JSONB for flexibility during Alpha)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS for Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Public properties are viewable by everyone." ON public.properties;
CREATE POLICY "Public properties are viewable by everyone." 
ON public.properties FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Service role can manage properties." ON public.properties;
CREATE POLICY "Service role can manage properties." 
ON public.properties FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create Indexes for Velocity Lookups
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_mls_id ON public.properties(mls_id);
CREATE INDEX IF NOT EXISTS idx_properties_price ON public.properties(price);
