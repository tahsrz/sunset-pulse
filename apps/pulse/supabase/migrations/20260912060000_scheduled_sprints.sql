-- Reusable scheduled sprint planning. Sprint planning creates assignments;
-- it does not execute external actions without user approval.
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  goal TEXT NOT NULL CHECK (char_length(goal) BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','active','completed','cancelled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  source_job_id UUID REFERENCES public.workflow_jobs(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sprint_backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240), description TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), estimate_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 240),
  description TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  estimate_minutes INTEGER CHECK (estimate_minutes IS NULL OR estimate_minutes BETWEEN 1 AND 10080),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','in_progress','blocked','done','cancelled')),
  dependency_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  assignment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_jobs ADD COLUMN IF NOT EXISTS result_id UUID;

ALTER TABLE public.workflow_schedules DROP CONSTRAINT IF EXISTS workflow_schedules_workflow_key_check;
ALTER TABLE public.workflow_schedules ADD CONSTRAINT workflow_schedules_workflow_key_check CHECK (workflow_key IN ('hotlist_email','sprint_planner'));
CREATE INDEX IF NOT EXISTS sprints_owner_status_idx ON public.sprints(owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS sprint_backlog_owner_status_idx ON public.sprint_backlog_items(owner_id, status, priority, created_at);
CREATE INDEX IF NOT EXISTS sprint_items_owner_status_idx ON public.sprint_items(owner_id, status, priority);
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages sprints" ON public.sprints;
CREATE POLICY "Service role manages sprints" ON public.sprints FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages sprint backlog" ON public.sprint_backlog_items;
CREATE POLICY "Service role manages sprint backlog" ON public.sprint_backlog_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages sprint items" ON public.sprint_items;
CREATE POLICY "Service role manages sprint items" ON public.sprint_items FOR ALL TO service_role USING (true) WITH CHECK (true);
