-- Internal lead operations extend the existing public leads table.
-- Research and active prospecting deliberately share a single lead id so
-- investigation notes and evidence remain intact when a lead is promoted.

DO $$
BEGIN
  CREATE TYPE public.lead_source AS ENUM (
    'expired_restart',
    'stale_dom',
    'absentee_owner',
    'open_house',
    'referral',
    'manual_entry'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.lead_status AS ENUM (
    'research',
    'new',
    'contacted',
    'nurture',
    'appointment',
    'dead'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Legacy site leads required a name and email. Research leads often start
-- with only an address or a raw tax/MLS record, so both must be optional.
ALTER TABLE public.leads
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS property_address TEXT,
  ADD COLUMN IF NOT EXISTS mailing_address TEXT,
  ADD COLUMN IF NOT EXISTS status public.lead_status DEFAULT 'research',
  ADD COLUMN IF NOT EXISTS prospecting_source public.lead_source,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw_paste_dump TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Existing consumer rows retain their legacy source/stage fields. The new
-- prospecting_source column provides strict source integrity for internal work.
UPDATE public.leads
SET status = 'new'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS leads_status_updated_idx
  ON public.leads (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS leads_assigned_to_updated_idx
  ON public.leads (assigned_to, updated_at DESC)
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_prospecting_source_idx
  ON public.leads (prospecting_source)
  WHERE prospecting_source IS NOT NULL;

DROP TRIGGER IF EXISTS set_leads_updated_at ON public.leads;
CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  is_pinned BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS lead_notes_lead_created_idx
  ON public.lead_notes (lead_id, is_pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_type TEXT,
  context TEXT
);

CREATE INDEX IF NOT EXISTS lead_attachments_lead_created_idx
  ON public.lead_attachments (lead_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-evidence',
  'lead-evidence',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage internal lead notes" ON public.lead_notes;
CREATE POLICY "Operators can manage internal lead notes"
ON public.lead_notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
);

DROP POLICY IF EXISTS "Operators can manage internal lead attachments" ON public.lead_attachments;
CREATE POLICY "Operators can manage internal lead attachments"
ON public.lead_attachments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
);

DROP POLICY IF EXISTS "Operators can manage internal leads" ON public.leads;
CREATE POLICY "Operators can manage internal leads"
ON public.leads
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
);

DROP POLICY IF EXISTS "Operators can read lead evidence" ON storage.objects;
CREATE POLICY "Operators can read lead evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-evidence'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('realtor', 'operator', 'admin')
  )
);
