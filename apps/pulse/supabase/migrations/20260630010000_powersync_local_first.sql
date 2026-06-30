-- User-owned, offline-capable data for the Phase 3 PowerSync client.

CREATE TABLE IF NOT EXISTS public.recent_property_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_property_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recent property views" ON public.recent_property_views;
CREATE POLICY "Users manage own recent property views"
ON public.recent_property_views FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users manage own saved searches"
ON public.saved_searches FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recent_property_views_owner
  ON public.recent_property_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_owner
  ON public.saved_searches(user_id, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    CREATE PUBLICATION powersync;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND schemaname = 'public' AND tablename = 'properties') THEN
    ALTER PUBLICATION powersync ADD TABLE public.properties;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND schemaname = 'public' AND tablename = 'collections') THEN
    ALTER PUBLICATION powersync ADD TABLE public.collections;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND schemaname = 'public' AND tablename = 'recent_property_views') THEN
    ALTER PUBLICATION powersync ADD TABLE public.recent_property_views;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'powersync' AND schemaname = 'public' AND tablename = 'saved_searches') THEN
    ALTER PUBLICATION powersync ADD TABLE public.saved_searches;
  END IF;
END $$;
