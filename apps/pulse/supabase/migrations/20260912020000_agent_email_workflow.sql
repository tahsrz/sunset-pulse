-- Allow spawned agents to save reviewed email drafts using the same audited run table.
ALTER TABLE public.licensed_workflow_runs
  DROP CONSTRAINT IF EXISTS licensed_workflow_runs_workflow_key_check;

ALTER TABLE public.licensed_workflow_runs
  ADD CONSTRAINT licensed_workflow_runs_workflow_key_check
  CHECK (workflow_key IN ('hotlist_email', 'agent_email'));
