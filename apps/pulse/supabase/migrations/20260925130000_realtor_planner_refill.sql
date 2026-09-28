-- Keep recurring planner occurrences and their opt-in in-app reminders filled
-- through the shared durable scheduler. Provider delivery is not involved.

ALTER TABLE public.workflow_schedules
  DROP CONSTRAINT IF EXISTS workflow_schedules_workflow_key_check;
ALTER TABLE public.workflow_schedules
  ADD CONSTRAINT workflow_schedules_workflow_key_check
CHECK (workflow_key IN ('hotlist_email', 'sprint_planner', 'realtor_planner'));

-- Keep scheduler coverage separate from materialized_through, which records
-- the furthest individually-created occurrence and is not a contiguous cursor.
ALTER TABLE public.realtor_planner_items
  ADD COLUMN IF NOT EXISTS refill_coverage_through DATE;

CREATE FUNCTION public.realtor_reset_refill_coverage()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.due_spec IS DISTINCT FROM OLD.due_spec THEN NEW.refill_coverage_through := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_reset_refill_coverage
BEFORE UPDATE OF due_spec ON public.realtor_planner_items
FOR EACH ROW EXECUTE FUNCTION public.realtor_reset_refill_coverage();
REVOKE ALL ON FUNCTION public.realtor_reset_refill_coverage() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.realtor_ensure_planner_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  zone TEXT;
  has_active_items BOOLEAN;
BEGIN
  SELECT p.time_zone INTO zone
  FROM public.realtor_preferences p
  WHERE p.user_id = NEW.user_id AND p.workspace_id = NEW.workspace_id;
  IF zone IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.realtor_planner_items i
    WHERE i.user_id = NEW.user_id AND i.workspace_id = NEW.workspace_id AND i.status = 'active'
  ) INTO has_active_items;

  IF has_active_items THEN
    INSERT INTO public.workflow_schedules(
      user_id, workflow_key, time_zone, cadence, local_hour, local_minute,
      local_weekday, planning_mode, enabled, next_run_at
    ) VALUES (
      NEW.user_id, 'realtor_planner', zone, 'daily', 3, 0, 1,
      'manual_backlog', true, clock_timestamp()
    )
    ON CONFLICT (user_id, workflow_key) DO UPDATE SET
      time_zone = EXCLUDED.time_zone,
      cadence = 'daily',
      local_hour = 3,
      local_minute = 0,
      next_run_at = LEAST(public.workflow_schedules.next_run_at, clock_timestamp()),
      revision = public.workflow_schedules.revision + 1,
      updated_at = clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER realtor_planner_schedule_sync
AFTER INSERT OR UPDATE OF status, due_spec ON public.realtor_planner_items
FOR EACH ROW EXECUTE FUNCTION public.realtor_ensure_planner_schedule();

CREATE OR REPLACE FUNCTION public.realtor_sync_planner_schedule_timezone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.time_zone IS DISTINCT FROM OLD.time_zone THEN
    UPDATE public.workflow_schedules s
    SET time_zone = NEW.time_zone, next_run_at = LEAST(s.next_run_at, clock_timestamp()),
        revision = s.revision + 1, updated_at = clock_timestamp()
    WHERE s.user_id = NEW.user_id AND s.workflow_key = 'realtor_planner'
      AND EXISTS (
        SELECT 1 FROM public.realtor_planner_items i
        WHERE i.user_id = NEW.user_id AND i.workspace_id = NEW.workspace_id AND i.status = 'active'
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER realtor_planner_timezone_sync
AFTER UPDATE OF time_zone ON public.realtor_preferences
FOR EACH ROW EXECUTE FUNCTION public.realtor_sync_planner_schedule_timezone();

-- Backfill schedules for planner items created before this migration. New
-- users still receive no schedule until they actually create a planner item.
INSERT INTO public.workflow_schedules(
  user_id, workflow_key, time_zone, cadence, local_hour, local_minute,
  local_weekday, planning_mode, enabled, next_run_at
)
SELECT DISTINCT i.user_id, 'realtor_planner', p.time_zone, 'daily', 3, 0, 1,
  'manual_backlog', true, clock_timestamp()
FROM public.realtor_planner_items i
JOIN public.realtor_preferences p ON p.user_id = i.user_id AND p.workspace_id = i.workspace_id
WHERE i.status = 'active'
ON CONFLICT (user_id, workflow_key) DO UPDATE SET
  time_zone = EXCLUDED.time_zone, cadence = 'daily', local_hour = 3,
  local_minute = 0,
  next_run_at = LEAST(public.workflow_schedules.next_run_at, clock_timestamp()),
  revision = public.workflow_schedules.revision + 1,
  updated_at = clock_timestamp();

CREATE OR REPLACE FUNCTION public.realtor_commit_planner_refill_batch(
  p_job_id UUID,
  p_lease_token UUID,
  p_coverage_through DATE,
  p_candidates JSONB
)
RETURNS TABLE(committed BOOLEAN, result_status TEXT, inserted_occurrences INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job public.workflow_jobs%ROWTYPE;
  candidate JSONB;
  occurrence_candidate JSONB;
  reminder JSONB;
  item public.realtor_planner_items%ROWTYPE;
  occurrence_id UUID;
  occurrence_revision INTEGER;
  occurrence_status TEXT;
  occurrence_item_revision INTEGER;
  original_date DATE;
  from_date DATE;
  inserted_count INTEGER := 0;
  remaining BOOLEAN;
BEGIN
  IF p_job_id IS NULL OR p_lease_token IS NULL OR p_coverage_through IS NULL
    OR p_candidates IS NULL OR jsonb_typeof(p_candidates) <> 'array'
    OR jsonb_array_length(p_candidates) > 25 THEN
    RAISE EXCEPTION 'Invalid planner refill batch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO job FROM public.workflow_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR job.workflow_key <> 'realtor_planner' OR job.trigger_kind <> 'scheduled'
    OR job.status <> 'running' OR job.lease_token IS DISTINCT FROM p_lease_token
    OR job.lease_until IS NULL OR job.lease_until <= clock_timestamp() THEN
    RETURN QUERY SELECT false, 'stale'::TEXT, 0;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workflow_schedules s
    WHERE s.id = job.schedule_id AND s.user_id = job.user_id
      AND s.workflow_key = 'realtor_planner' AND s.enabled
  ) THEN
    INSERT INTO public.workflow_results(job_id, workflow_key, result_type, result_id)
    VALUES (job.id, job.workflow_key, 'realtor_planner_refill', job.id)
    ON CONFLICT (job_id) DO UPDATE SET result_type = EXCLUDED.result_type, result_id = EXCLUDED.result_id;
    UPDATE public.workflow_jobs SET status = 'completed', result_id = job.id,
      lease_until = NULL, lease_token = NULL, retry_at = NULL,
      error = 'Planner schedule disabled before refill.', updated_at = clock_timestamp()
    WHERE id = job.id;
    RETURN QUERY SELECT true, 'schedule_disabled'::TEXT, 0;
    RETURN;
  END IF;

  IF p_coverage_through < (clock_timestamp() AT TIME ZONE COALESCE((
      SELECT p.time_zone FROM public.realtor_preferences p WHERE p.user_id = job.user_id
    ), 'America/Chicago'))::DATE
    OR p_coverage_through > (clock_timestamp() AT TIME ZONE COALESCE((
      SELECT p.time_zone FROM public.realtor_preferences p WHERE p.user_id = job.user_id
    ), 'America/Chicago'))::DATE + 90 THEN
    RAISE EXCEPTION 'Planner refill horizon is outside the allowed window' USING ERRCODE = '22023';
  END IF;

  FOR candidate IN SELECT value FROM jsonb_array_elements(p_candidates) LOOP
    IF jsonb_typeof(candidate) IS DISTINCT FROM 'object'
      OR jsonb_typeof(candidate->'occurrences') IS DISTINCT FROM 'array'
      OR jsonb_array_length(candidate->'occurrences') > 200 THEN
      RAISE EXCEPTION 'Invalid planner item candidate' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO item FROM public.realtor_planner_items i
    WHERE i.id = (candidate->>'itemId')::UUID AND i.user_id = job.user_id
      AND i.workspace_id = (candidate->>'workspaceId')::UUID
      AND i.workspace_id = (SELECT p.workspace_id FROM public.realtor_preferences p WHERE p.user_id = job.user_id)
      AND i.status = 'active'
    FOR UPDATE;
    IF NOT FOUND OR item.revision <> (candidate->>'itemRevision')::INTEGER THEN
      CONTINUE;
    END IF;

    from_date := (candidate->>'fromDate')::DATE;
    IF candidate->>'throughDate' <> p_coverage_through::TEXT
      OR (item.refill_coverage_through IS NOT NULL AND item.refill_coverage_through >= p_coverage_through)
      OR (item.refill_coverage_through IS NOT NULL AND from_date <> item.refill_coverage_through + 1)
      OR (item.refill_coverage_through IS NULL AND from_date < (item.due_spec->>'anchorDate')::DATE)
      OR from_date > p_coverage_through THEN
      CONTINUE;
    END IF;

    -- The recurrence expansion is generated from the validated stored due_spec
    -- by the trusted server handler; this RPC fences the owner, revision,
    -- coverage cursor, date bounds and all writes in one transaction.
    FOR occurrence_candidate IN SELECT value FROM jsonb_array_elements(candidate->'occurrences') LOOP
      original_date := (occurrence_candidate->>'originalDate')::DATE;
      IF original_date < from_date OR original_date > p_coverage_through
        OR occurrence_candidate->>'effectiveDate' IS NULL
        OR (occurrence_candidate->>'effectiveDate')::DATE < from_date
        OR (occurrence_candidate->>'effectiveDate')::DATE > p_coverage_through
        OR jsonb_typeof(occurrence_candidate->'reminders') IS DISTINCT FROM 'array'
        OR jsonb_array_length(occurrence_candidate->'reminders') > 3 THEN
        RAISE EXCEPTION 'Invalid planner occurrence candidate' USING ERRCODE = '22023';
      END IF;

      occurrence_id := NULL;
      INSERT INTO public.realtor_planner_occurrences(
        item_id, user_id, workspace_id, occurrence_key, original_date,
        effective_date, effective_time, item_revision, title_snapshot,
        kind_snapshot, expected_amount_cents
      ) VALUES (
        item.id, item.user_id, item.workspace_id, item.id::TEXT || ':' || original_date::TEXT,
        original_date, (occurrence_candidate->>'effectiveDate')::DATE,
        NULLIF(item.due_spec->>'localTime', 'null')::TIME, item.revision,
        item.title, item.kind, item.expected_amount_cents
      ) ON CONFLICT (item_id, occurrence_key) DO NOTHING
      RETURNING id, revision INTO occurrence_id, occurrence_revision;

      IF occurrence_id IS NOT NULL THEN
        inserted_count := inserted_count + 1;
        occurrence_status := 'pending';
        occurrence_item_revision := item.revision;
      ELSE
        SELECT o.id, o.revision, o.status, o.item_revision
        INTO occurrence_id, occurrence_revision, occurrence_status, occurrence_item_revision
        FROM public.realtor_planner_occurrences o
        WHERE o.item_id = item.id AND o.occurrence_key = item.id::TEXT || ':' || original_date::TEXT
        FOR UPDATE;
      END IF;

      -- Repair a missing reminder row after reminder admission was disabled,
      -- without reactivating a dismissed reminder or a resolved occurrence.
      IF occurrence_id IS NOT NULL AND occurrence_status = 'pending'
        AND occurrence_item_revision = item.revision THEN
        FOR reminder IN SELECT value FROM jsonb_array_elements(occurrence_candidate->'reminders') LOOP
          IF (reminder->>'offsetDays')::INTEGER NOT BETWEEN 0 AND 365
            OR (reminder->>'scheduledAt')::TIMESTAMPTZ IS NULL THEN
            RAISE EXCEPTION 'Invalid planner reminder candidate' USING ERRCODE = '22023';
          END IF;
          INSERT INTO public.realtor_reminders(
            occurrence_id, user_id, workspace_id, occurrence_revision, offset_days, scheduled_at
          ) VALUES (
            occurrence_id, item.user_id, item.workspace_id, occurrence_revision,
            (reminder->>'offsetDays')::INTEGER, (reminder->>'scheduledAt')::TIMESTAMPTZ
          ) ON CONFLICT ON CONSTRAINT realtor_reminders_occurrence_revision_offset_unique DO NOTHING;
        END LOOP;
      END IF;
    END LOOP;

    UPDATE public.realtor_planner_items
    SET refill_coverage_through = p_coverage_through, updated_at = clock_timestamp()
    WHERE id = item.id AND revision = item.revision;
  END LOOP;

  IF job.lease_until <= clock_timestamp() THEN
    RETURN QUERY SELECT false, 'stale'::TEXT, inserted_count;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.realtor_planner_items i
    JOIN public.realtor_preferences p ON p.user_id = i.user_id AND p.workspace_id = i.workspace_id
    WHERE i.user_id = job.user_id AND i.status = 'active'
      AND (i.due_spec->>'anchorDate')::DATE <= p_coverage_through
      AND (i.refill_coverage_through IS NULL OR i.refill_coverage_through < p_coverage_through)
  ) INTO remaining;

  IF remaining THEN
    RETURN QUERY SELECT false, 'batch_committed'::TEXT, inserted_count;
    RETURN;
  END IF;

  INSERT INTO public.workflow_results(job_id, workflow_key, result_type, result_id)
  VALUES (job.id, job.workflow_key, 'realtor_planner_refill', job.id)
  ON CONFLICT (job_id) DO UPDATE SET
    workflow_key = EXCLUDED.workflow_key,
    result_type = EXCLUDED.result_type,
    result_id = EXCLUDED.result_id;
  UPDATE public.workflow_jobs
  SET status = 'completed', result_id = job.id, lease_until = NULL,
      lease_token = NULL, retry_at = NULL, error = NULL, updated_at = clock_timestamp()
  WHERE id = job.id;

  RETURN QUERY SELECT true, 'completed'::TEXT, inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.realtor_ensure_planner_schedule() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.realtor_sync_planner_schedule_timezone() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.realtor_commit_planner_refill_batch(UUID, UUID, DATE, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_commit_planner_refill_batch(UUID, UUID, DATE, JSONB) TO service_role;
