-- Bind approval and delivery to the exact draft/audience that was reviewed.
ALTER TABLE public.licensed_workflow_runs
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS audience_hash TEXT;

UPDATE public.licensed_workflow_runs
SET audience_hash = md5(recipient_snapshot::text)
WHERE audience_hash IS NULL;

ALTER TABLE public.licensed_workflow_runs
  ALTER COLUMN audience_hash SET NOT NULL;

CREATE INDEX IF NOT EXISTS licensed_workflow_runs_owner_key_idx
  ON public.licensed_workflow_runs(user_id, idempotency_key);
