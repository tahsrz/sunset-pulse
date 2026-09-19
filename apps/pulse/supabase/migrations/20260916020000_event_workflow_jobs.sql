-- Package S6: let one-off, service-authorized events share the durable
-- scheduler without weakening the existing recurring-schedule path.

ALTER TABLE public.workflow_jobs
  ALTER COLUMN schedule_id DROP NOT NULL;

ALTER TABLE public.workflow_jobs
  ADD COLUMN IF NOT EXISTS trigger_kind TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS event_key TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payload_version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_jobs'::regclass
      AND conname = 'workflow_jobs_trigger_shape_check'
  ) THEN
    ALTER TABLE public.workflow_jobs
      ADD CONSTRAINT workflow_jobs_trigger_shape_check CHECK (
        (trigger_kind = 'scheduled' AND schedule_id IS NOT NULL AND event_key IS NULL)
        OR
        (trigger_kind = 'event' AND schedule_id IS NULL AND event_key IS NOT NULL)
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_jobs'::regclass
      AND conname = 'workflow_jobs_trigger_kind_check'
  ) THEN
    ALTER TABLE public.workflow_jobs
      ADD CONSTRAINT workflow_jobs_trigger_kind_check CHECK (trigger_kind IN ('scheduled', 'event'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workflow_jobs'::regclass
      AND conname = 'workflow_jobs_payload_version_check'
  ) THEN
    ALTER TABLE public.workflow_jobs
      ADD CONSTRAINT workflow_jobs_payload_version_check CHECK (payload_version > 0);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS workflow_jobs_event_identity_idx
  ON public.workflow_jobs(user_id, workflow_key, event_key)
  WHERE trigger_kind = 'event' AND event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.workflow_event_contracts (
  workflow_key TEXT PRIMARY KEY,
  min_payload_version INTEGER NOT NULL DEFAULT 1 CHECK (min_payload_version > 0),
  max_payload_version INTEGER NOT NULL DEFAULT 1 CHECK (max_payload_version >= min_payload_version),
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.workflow_event_contracts (workflow_key)
VALUES ('hotlist_email'), ('sprint_planner')
ON CONFLICT (workflow_key) DO NOTHING;

ALTER TABLE public.workflow_event_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages workflow event contracts" ON public.workflow_event_contracts;
CREATE POLICY "Service role manages workflow event contracts"
  ON public.workflow_event_contracts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.enqueue_workflow_event(
  p_user_id UUID,
  p_workflow_key TEXT,
  p_event_key TEXT,
  p_payload JSONB,
  p_payload_version INTEGER DEFAULT 1,
  p_scheduled_for TIMESTAMPTZ DEFAULT now()
)
RETURNS SETOF public.workflow_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contract_row public.workflow_event_contracts%ROWTYPE;
  existing_job public.workflow_jobs%ROWTYPE;
  inserted_job public.workflow_jobs%ROWTYPE;
BEGIN
  IF p_user_id IS NULL
    OR p_workflow_key IS NULL
    OR char_length(btrim(p_workflow_key)) = 0
    OR char_length(p_workflow_key) > 120
    OR p_event_key IS NULL
    OR char_length(btrim(p_event_key)) = 0
    OR char_length(p_event_key) > 240
    OR p_payload IS NULL
    OR jsonb_typeof(p_payload) <> 'object'
    OR p_payload_version IS NULL
    OR p_scheduled_for IS NULL THEN
    RAISE EXCEPTION 'Invalid workflow event request';
  END IF;

  SELECT * INTO contract_row
  FROM public.workflow_event_contracts
  WHERE workflow_key = btrim(p_workflow_key) AND enabled = true;

  IF NOT FOUND
    OR p_payload_version < contract_row.min_payload_version
    OR p_payload_version > contract_row.max_payload_version THEN
    RAISE EXCEPTION 'Unsupported workflow event contract';
  END IF;

  SELECT * INTO existing_job
  FROM public.workflow_jobs
  WHERE user_id = p_user_id
    AND workflow_key = btrim(p_workflow_key)
    AND trigger_kind = 'event'
    AND event_key = btrim(p_event_key)
  FOR UPDATE;

  IF FOUND THEN
    IF existing_job.payload_version <> p_payload_version
      OR existing_job.payload IS DISTINCT FROM p_payload
      OR existing_job.scheduled_for <> p_scheduled_for THEN
      RAISE EXCEPTION 'Workflow event key already exists with a different payload';
    END IF;
    RETURN NEXT existing_job;
    RETURN;
  END IF;

  INSERT INTO public.workflow_jobs (
    schedule_id, user_id, workflow_key, trigger_kind, event_key,
    payload, payload_version, scheduled_for, status
  )
  VALUES (
    NULL, p_user_id, btrim(p_workflow_key), 'event', btrim(p_event_key),
    p_payload, p_payload_version, p_scheduled_for, 'queued'
  )
  ON CONFLICT (user_id, workflow_key, event_key)
    WHERE trigger_kind = 'event' AND event_key IS NOT NULL
  DO NOTHING
  RETURNING * INTO inserted_job;

  IF NOT FOUND THEN
    SELECT * INTO existing_job
    FROM public.workflow_jobs
    WHERE user_id = p_user_id
      AND workflow_key = btrim(p_workflow_key)
      AND trigger_kind = 'event'
      AND event_key = btrim(p_event_key)
    FOR UPDATE;
    IF NOT FOUND
      OR existing_job.payload_version <> p_payload_version
      OR existing_job.payload IS DISTINCT FROM p_payload
      OR existing_job.scheduled_for <> p_scheduled_for THEN
      RAISE EXCEPTION 'Workflow event key already exists with a different payload';
    END IF;
    RETURN NEXT existing_job;
    RETURN;
  END IF;

  RETURN NEXT inserted_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_workflow_jobs(
  p_limit INTEGER,
  p_lease_seconds INTEGER DEFAULT 300
)
RETURNS SETOF public.workflow_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Workflow claim limit must be between 1 and 100.';
  END IF;
  IF p_lease_seconds IS NULL OR p_lease_seconds < 30 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION 'Workflow lease must be between 30 and 900 seconds.';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT job.id
    FROM public.workflow_jobs AS job
    LEFT JOIN public.workflow_schedules AS schedule
      ON schedule.id = job.schedule_id
     AND schedule.user_id = job.user_id
     AND schedule.workflow_key = job.workflow_key
    WHERE job.status = 'queued'
      AND job.scheduled_for <= now()
      AND (job.retry_at IS NULL OR job.retry_at <= now())
      AND job.attempts < 3
      AND (
        (job.trigger_kind = 'scheduled' AND schedule.id IS NOT NULL AND schedule.enabled = true)
        OR
        (job.trigger_kind = 'event' AND job.schedule_id IS NULL)
      )
    ORDER BY job.scheduled_for, job.id
    FOR UPDATE OF job SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.workflow_jobs AS job
  SET status = 'running',
      attempts = job.attempts + 1,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      lease_token = gen_random_uuid(),
      retry_at = NULL,
      updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_workflow_event(UUID, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_workflow_event(UUID, TEXT, TEXT, JSONB, INTEGER, TIMESTAMPTZ) TO service_role;
REVOKE ALL ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workflow_jobs(INTEGER, INTEGER) TO service_role;
