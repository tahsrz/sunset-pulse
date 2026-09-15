CREATE TABLE IF NOT EXISTS public.property_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.property_shortlist_entries(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('user', 'jamie')),
  source_command_id TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_notes_owner_property_idx ON public.property_notes(owner_id, property_id, created_at DESC);
ALTER TABLE public.property_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS property_notes_owner_access ON public.property_notes;
CREATE POLICY property_notes_owner_access ON public.property_notes FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
