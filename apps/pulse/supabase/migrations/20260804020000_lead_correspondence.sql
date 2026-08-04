CREATE TABLE IF NOT EXISTS public.lead_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'letter')),
  subject_template TEXT CHECK (subject_template IS NULL OR char_length(subject_template) <= 300),
  body_template TEXT NOT NULL CHECK (char_length(body_template) BETWEEN 1 AND 12000),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.lead_message_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'letter')),
  recipient_email TEXT,
  subject TEXT CHECK (subject IS NULL OR char_length(subject) <= 300),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 12000),
  variable_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_message_drafts_lead_updated_idx
  ON public.lead_message_drafts (lead_id, updated_at DESC);

DROP TRIGGER IF EXISTS set_lead_message_templates_updated_at ON public.lead_message_templates;
CREATE TRIGGER set_lead_message_templates_updated_at BEFORE UPDATE ON public.lead_message_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lead_message_drafts_updated_at ON public.lead_message_drafts;
CREATE TRIGGER set_lead_message_drafts_updated_at BEFORE UPDATE ON public.lead_message_drafts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_message_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators can manage lead message templates" ON public.lead_message_templates;
CREATE POLICY "Operators can manage lead message templates" ON public.lead_message_templates FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('realtor', 'operator', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('realtor', 'operator', 'admin')));

DROP POLICY IF EXISTS "Operators can manage lead message drafts" ON public.lead_message_drafts;
CREATE POLICY "Operators can manage lead message drafts" ON public.lead_message_drafts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('realtor', 'operator', 'admin')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('realtor', 'operator', 'admin')));
