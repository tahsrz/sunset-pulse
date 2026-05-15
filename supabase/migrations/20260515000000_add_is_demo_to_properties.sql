-- ADD is_demo COLUMN TO PROPERTIES TABLE
-- This allows us to filter out demo/mock listings from the live grid.

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Update existing indexes if needed, though boolean filters are fast
CREATE INDEX IF NOT EXISTS idx_properties_is_demo ON public.properties(is_demo);
