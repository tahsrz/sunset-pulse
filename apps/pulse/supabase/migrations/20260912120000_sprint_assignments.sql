-- Package C: provenance, idempotent scheduled proposals, and persistent assignments.
ALTER TABLE public.sprint_backlog_items
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'pulse_command', 'github', 'crm')),
  ADD COLUMN IF NOT EXISTS source_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS sprint_backlog_items_owner_source_idx
  ON public.sprint_backlog_items (owner_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS source_job_id UUID,
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS sprints_source_job_idx
  ON public.sprints (source_job_id)
  WHERE source_job_id IS NOT NULL;

ALTER TABLE public.sprint_items
  ADD COLUMN IF NOT EXISTS backlog_item_id UUID REFERENCES public.sprint_backlog_items(id),
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sprint_item_id UUID NOT NULL REFERENCES public.sprint_items(id) ON DELETE CASCADE,
  worker_id TEXT,
  instructions TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unassigned' CHECK (status IN ('unassigned', 'assigned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sprint_item_id)
);

CREATE INDEX IF NOT EXISTS agent_assignments_owner_status_idx
  ON public.agent_assignments (owner_id, status);

ALTER TABLE public.agent_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_assignments_owner_access ON public.agent_assignments;
CREATE POLICY agent_assignments_owner_access ON public.agent_assignments
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
