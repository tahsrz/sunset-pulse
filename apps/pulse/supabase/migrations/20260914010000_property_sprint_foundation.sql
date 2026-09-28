CREATE TABLE IF NOT EXISTS public.property_shortlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL DEFAULT 'keller-westlake',
  address TEXT,
  city TEXT,
  state TEXT NOT NULL DEFAULT 'TX',
  postal_code TEXT,
  mls_id TEXT,
  county TEXT,
  parcel_number TEXT,
  property_kind TEXT NOT NULL CHECK (property_kind IN ('residential', 'land')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  unresolved_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS property_shortlist_owner_mls_idx ON public.property_shortlist_entries(owner_id, mls_id) WHERE mls_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS property_shortlist_owner_parcel_idx ON public.property_shortlist_entries(owner_id, county, parcel_number) WHERE county IS NOT NULL AND parcel_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS property_shortlist_owner_area_idx ON public.property_shortlist_entries(owner_id, area_key, status);

ALTER TABLE public.workflow_schedules
  ADD COLUMN IF NOT EXISTS planning_mode TEXT NOT NULL DEFAULT 'manual_backlog'
    CHECK (planning_mode IN ('manual_backlog', 'property_shortlist'));
ALTER TABLE public.workflow_jobs
  ADD COLUMN IF NOT EXISTS planning_mode TEXT;

CREATE TABLE IF NOT EXISTS public.property_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.property_shortlist_entries(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('user_supplied', 'mls', 'municipal', 'web', 'other')),
  source_label TEXT NOT NULL,
  source_url TEXT,
  source_text TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_sources_owner_property_idx ON public.property_sources(owner_id, property_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.property_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.property_shortlist_entries(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  value JSONB NOT NULL,
  source_id UUID REFERENCES public.property_sources(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'supplied' CHECK (verification_status IN ('supplied', 'confirmed', 'conflicting')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, field_name, source_id)
);
CREATE INDEX IF NOT EXISTS property_facts_owner_property_idx ON public.property_facts(owner_id, property_id, field_name);

ALTER TABLE public.sprint_backlog_items
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.property_shortlist_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_task_kind TEXT,
  ADD COLUMN IF NOT EXISTS input_revision INTEGER,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
ALTER TABLE public.sprint_backlog_items DROP CONSTRAINT IF EXISTS sprint_backlog_items_source_type_check;
ALTER TABLE public.sprint_backlog_items ADD CONSTRAINT sprint_backlog_items_source_type_check CHECK (source_type IN ('manual', 'pulse_command', 'property_shortlist', 'github', 'crm'));
CREATE UNIQUE INDEX IF NOT EXISTS sprint_backlog_owner_dedupe_idx ON public.sprint_backlog_items(owner_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.sprint_items
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.property_shortlist_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_revision INTEGER;
ALTER TABLE public.agent_assignments
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.property_shortlist_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_revision INTEGER;

CREATE TABLE IF NOT EXISTS public.property_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.property_shortlist_entries(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.agent_assignments(id) ON DELETE SET NULL,
  output_kind TEXT NOT NULL CHECK (output_kind IN ('research_brief', 'buyer_brief', 'email_draft', 'follow_up')),
  content TEXT NOT NULL,
  source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_revision INTEGER NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'stale')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_artifacts_owner_property_idx ON public.property_artifacts(owner_id, property_id, created_at DESC);

ALTER TABLE public.property_shortlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_artifacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS property_shortlist_owner_access ON public.property_shortlist_entries;
CREATE POLICY property_shortlist_owner_access ON public.property_shortlist_entries FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS property_sources_owner_access ON public.property_sources;
CREATE POLICY property_sources_owner_access ON public.property_sources FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS property_facts_owner_access ON public.property_facts;
CREATE POLICY property_facts_owner_access ON public.property_facts FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS property_artifacts_owner_access ON public.property_artifacts;
CREATE POLICY property_artifacts_owner_access ON public.property_artifacts FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
