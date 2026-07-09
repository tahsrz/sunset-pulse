-- Backend-controlled Tour Studio / homepage hot-list configuration.
-- The public homepage reads this through the server-side service role and then
-- resolves every target against canonical MLS listings before rendering.

CREATE TABLE IF NOT EXISTS public.tour_hot_lists (
  id TEXT PRIMARY KEY DEFAULT 'default',
  targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_mls_ids TEXT NOT NULL DEFAULT '',
  raw_addresses TEXT NOT NULL DEFAULT '',
  limit_count INTEGER NOT NULL DEFAULT 10,
  updated_by JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tour_hot_lists_id_check CHECK (id = 'default'),
  CONSTRAINT tour_hot_lists_targets_array_check CHECK (jsonb_typeof(targets) = 'array'),
  CONSTRAINT tour_hot_lists_targets_size_check CHECK (jsonb_array_length(targets) <= 50),
  CONSTRAINT tour_hot_lists_raw_mls_ids_size_check CHECK (char_length(raw_mls_ids) <= 5000),
  CONSTRAINT tour_hot_lists_raw_addresses_size_check CHECK (char_length(raw_addresses) <= 10000),
  CONSTRAINT tour_hot_lists_limit_count_check CHECK (limit_count BETWEEN 1 AND 24)
);

ALTER TABLE public.tour_hot_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages tour hot lists." ON public.tour_hot_lists;
CREATE POLICY "Service role manages tour hot lists."
ON public.tour_hot_lists FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tour_hot_lists_updated_at
  ON public.tour_hot_lists(updated_at DESC);
