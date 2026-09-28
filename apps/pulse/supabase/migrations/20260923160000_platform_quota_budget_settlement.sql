-- Add durable per-run budgets and idempotent reservation settlement. Provider
-- dispatch remains disabled; these rows are accounting evidence only.

ALTER TABLE public.platform_quota_limits
  ADD COLUMN max_tokens_per_run INTEGER NOT NULL DEFAULT 100000 CHECK (max_tokens_per_run BETWEEN 0 AND 10000000),
  ADD COLUMN max_run_estimated_cost_usd NUMERIC(12,6) NOT NULL DEFAULT 5 CHECK (max_run_estimated_cost_usd >= 0),
  ADD COLUMN max_run_duration_seconds INTEGER NOT NULL DEFAULT 3600 CHECK (max_run_duration_seconds BETWEEN 1 AND 86400);

ALTER TABLE public.platform_capability_reservations
  ADD COLUMN estimated_tokens INTEGER NOT NULL DEFAULT 0 CHECK (estimated_tokens BETWEEN 0 AND 10000000),
  ADD COLUMN actual_tokens INTEGER CHECK (actual_tokens BETWEEN 0 AND 10000000),
  ADD COLUMN actual_cost_usd NUMERIC(12,6) CHECK (actual_cost_usd >= 0),
  ADD COLUMN settled_at TIMESTAMPTZ,
  ADD COLUMN expires_at TIMESTAMPTZ;

ALTER TABLE public.platform_capability_reservations
  ADD CONSTRAINT platform_capability_reservation_settlement_check CHECK (
    (status='reserved' AND settled_at IS NULL AND actual_tokens IS NULL AND actual_cost_usd IS NULL)
    OR (status='consumed' AND settled_at IS NOT NULL AND actual_tokens IS NOT NULL AND actual_cost_usd IS NOT NULL)
    OR (status IN ('released','expired') AND settled_at IS NOT NULL AND actual_tokens IS NULL AND actual_cost_usd IS NULL)
  ) NOT VALID;
UPDATE public.platform_capability_reservations SET expires_at=created_at+interval '15 minutes'
  WHERE status='reserved' AND expires_at IS NULL;
CREATE INDEX platform_capability_reservations_run_budget_idx
  ON public.platform_capability_reservations(workspace_id,run_id,status);

CREATE FUNCTION public.platform_save_quota_budget(
  p_actor_id UUID, p_workspace_id UUID, p_max_concurrent_operations INTEGER,
  p_max_steps_per_run INTEGER, p_max_estimated_cost_usd NUMERIC,
  p_max_tokens_per_run INTEGER, p_max_run_estimated_cost_usd NUMERIC,
  p_max_run_duration_seconds INTEGER, p_expected_revision INTEGER
)
RETURNS SETOF public.platform_quota_limits LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_quota_limits%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_max_concurrent_operations NOT BETWEEN 1 AND 1000 OR p_max_steps_per_run NOT BETWEEN 1 AND 10000
    OR p_max_estimated_cost_usd IS NULL OR p_max_estimated_cost_usd < 0
    OR p_max_tokens_per_run NOT BETWEEN 0 AND 10000000
    OR p_max_run_estimated_cost_usd IS NULL OR p_max_run_estimated_cost_usd < 0
    OR p_max_run_duration_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'Invalid quota budget' USING ERRCODE='22023';
  END IF;
  SELECT * INTO saved FROM public.platform_quota_limits WHERE workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Quota revision conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.platform_quota_limits(workspace_id,max_concurrent_operations,max_steps_per_run,max_estimated_cost_usd,
      max_tokens_per_run,max_run_estimated_cost_usd,max_run_duration_seconds,updated_by)
      VALUES(p_workspace_id,p_max_concurrent_operations,p_max_steps_per_run,p_max_estimated_cost_usd,
      p_max_tokens_per_run,p_max_run_estimated_cost_usd,p_max_run_duration_seconds,p_actor_id) RETURNING * INTO saved;
  ELSE
    IF p_expected_revision IS DISTINCT FROM saved.revision THEN RAISE EXCEPTION 'Quota revision conflict' USING ERRCODE='40001'; END IF;
    UPDATE public.platform_quota_limits SET max_concurrent_operations=p_max_concurrent_operations,
      max_steps_per_run=p_max_steps_per_run,max_estimated_cost_usd=p_max_estimated_cost_usd,
      max_tokens_per_run=p_max_tokens_per_run,max_run_estimated_cost_usd=p_max_run_estimated_cost_usd,
      max_run_duration_seconds=p_max_run_duration_seconds,revision=revision+1,updated_by=p_actor_id,updated_at=now()
      WHERE workspace_id=p_workspace_id RETURNING * INTO saved;
  END IF;
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_save_quota_budget(UUID,UUID,INTEGER,INTEGER,NUMERIC,INTEGER,NUMERIC,INTEGER,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_save_quota_budget(UUID,UUID,INTEGER,INTEGER,NUMERIC,INTEGER,NUMERIC,INTEGER,INTEGER) TO service_role;

CREATE FUNCTION public.platform_reconcile_capability_reservations(p_workspace_id UUID,p_limit INTEGER DEFAULT 100)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reconciled INTEGER;
BEGIN
  IF p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid reconciliation limit' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.platform_quota_limits WHERE workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace quota is not configured' USING ERRCODE='55000'; END IF;
  WITH expired AS (
    UPDATE public.platform_capability_reservations r SET status='expired',settled_at=clock_timestamp(),released_at=clock_timestamp()
      WHERE r.id IN (
        SELECT candidate.id FROM public.platform_capability_reservations candidate
        WHERE candidate.workspace_id=p_workspace_id AND candidate.status='reserved' AND candidate.expires_at<=clock_timestamp()
        ORDER BY candidate.expires_at,candidate.created_at,candidate.id LIMIT p_limit FOR UPDATE SKIP LOCKED
      ) RETURNING r.workspace_id,r.run_id,r.id,r.operation_id
  ), audited AS (
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
      SELECT e.workspace_id,r.requested_by,'service','capability.operation.expired','capability_reservation',e.id::TEXT,
        jsonb_build_object('operationId',e.operation_id,'source','bounded_reconciliation')
      FROM expired e JOIN public.platform_runs r ON r.id=e.run_id AND r.workspace_id=e.workspace_id
      RETURNING 1
  ) SELECT count(*)::INTEGER INTO reconciled FROM audited;
  RETURN reconciled;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_reconcile_capability_reservations(UUID,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_reconcile_capability_reservations(UUID,INTEGER) TO service_role;

DROP FUNCTION public.platform_admit_capability_operation(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,NUMERIC);
CREATE FUNCTION public.platform_admit_capability_operation(
  p_workspace_id UUID, p_app_install_id UUID, p_run_id UUID, p_operation_id UUID,
  p_connection_id TEXT, p_tool TEXT, p_operation TEXT, p_input_schema_hash TEXT,
  p_output_schema_hash TEXT, p_step_units INTEGER, p_estimated_cost_usd NUMERIC,
  p_estimated_tokens INTEGER DEFAULT 0
)
RETURNS SETOF public.platform_capability_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_capability_reservations%ROWTYPE; policy JSONB; quota public.platform_quota_limits%ROWTYPE;
  run_created TIMESTAMPTZ; run_status TEXT; now_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_operation_id IS NULL OR p_step_units NOT BETWEEN 1 AND 10000 OR p_estimated_cost_usd IS NULL OR p_estimated_cost_usd < 0
    OR p_estimated_tokens NOT BETWEEN 0 AND 10000000 OR p_connection_id !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_tool !~ '^[a-z][a-z0-9_.:-]{0,127}$' OR p_operation !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_input_schema_hash !~ '^[a-f0-9]{64}$' OR p_output_schema_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid capability admission request' USING ERRCODE='22023';
  END IF;
  SELECT * INTO saved FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF saved.run_id<>p_run_id OR saved.connection_id<>p_connection_id OR saved.tool<>p_tool OR saved.operation<>p_operation
      OR saved.input_schema_hash<>p_input_schema_hash OR saved.output_schema_hash<>p_output_schema_hash
      OR saved.step_units<>p_step_units OR saved.estimated_cost_usd<>p_estimated_cost_usd OR saved.estimated_tokens<>p_estimated_tokens THEN
      RAISE EXCEPTION 'Capability operation identity conflict' USING ERRCODE='40001';
    END IF;
    RETURN NEXT saved; RETURN;
  END IF;
  SELECT created_at,status INTO run_created,run_status FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run is outside workspace' USING ERRCODE='42501'; END IF;
  IF run_status NOT IN ('ready','waiting') THEN RAISE EXCEPTION 'Run is not accepting capability reservations' USING ERRCODE='55000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_app_installs WHERE id=p_app_install_id AND workspace_id=p_workspace_id) THEN
    RAISE EXCEPTION 'App install is outside workspace' USING ERRCODE='42501';
  END IF;
  SELECT policies.policy INTO policy FROM public.platform_capability_policies AS policies
    WHERE policies.app_install_id=p_app_install_id AND policies.workspace_id=p_workspace_id;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(policy->'capabilities') declaration
    WHERE declaration->>'connectionId'=p_connection_id AND declaration->>'tool'=p_tool AND declaration->>'operation'=p_operation
      AND declaration->>'inputSchemaHash'=p_input_schema_hash AND declaration->>'outputSchemaHash'=p_output_schema_hash
      AND declaration->>'actionClass' IN ('read','prepare')) THEN
    RAISE EXCEPTION 'Capability is not admitted by the pinned policy' USING ERRCODE='55000';
  END IF;
  SELECT * INTO quota FROM public.platform_quota_limits WHERE workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace quota is not configured' USING ERRCODE='55000'; END IF;
  -- Serialize replays of the same operation as well as distinct reservations.
  SELECT * INTO saved FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF saved.run_id<>p_run_id OR saved.connection_id<>p_connection_id OR saved.tool<>p_tool OR saved.operation<>p_operation
      OR saved.input_schema_hash<>p_input_schema_hash OR saved.output_schema_hash<>p_output_schema_hash
      OR saved.step_units<>p_step_units OR saved.estimated_cost_usd<>p_estimated_cost_usd OR saved.estimated_tokens<>p_estimated_tokens THEN
      RAISE EXCEPTION 'Capability operation identity conflict' USING ERRCODE='40001';
    END IF;
    RETURN NEXT saved; RETURN;
  END IF;

  -- Expired reservations stop consuming concurrent capacity. Operation IDs
  -- remain durable and cannot be reused, preserving replay idempotency.
  PERFORM public.platform_reconcile_capability_reservations(p_workspace_id,100);
  IF run_created + make_interval(secs=>quota.max_run_duration_seconds) <= now_at THEN
    RAISE EXCEPTION 'Run time budget exceeded' USING ERRCODE='55P03';
  END IF;
  IF (SELECT count(*) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND status='reserved') >= quota.max_concurrent_operations
    OR (SELECT COALESCE(sum(step_units),0) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND run_id=p_run_id AND status IN ('reserved','consumed')) + p_step_units > quota.max_steps_per_run
    OR (SELECT COALESCE(sum(CASE WHEN status='reserved' THEN estimated_tokens ELSE actual_tokens END),0) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND run_id=p_run_id AND status IN ('reserved','consumed')) + p_estimated_tokens > quota.max_tokens_per_run
    OR (SELECT COALESCE(sum(estimated_cost_usd),0) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND status='reserved') + p_estimated_cost_usd > quota.max_estimated_cost_usd
    OR (SELECT COALESCE(sum(CASE WHEN status='reserved' THEN estimated_cost_usd ELSE actual_cost_usd END),0) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND run_id=p_run_id AND status IN ('reserved','consumed')) + p_estimated_cost_usd > quota.max_run_estimated_cost_usd THEN
    RAISE EXCEPTION 'Capability quota exceeded' USING ERRCODE='55P03';
  END IF;
  INSERT INTO public.platform_capability_reservations(workspace_id,run_id,operation_id,connection_id,tool,operation,
    input_schema_hash,output_schema_hash,step_units,estimated_cost_usd,estimated_tokens,expires_at)
    VALUES(p_workspace_id,p_run_id,p_operation_id,p_connection_id,p_tool,p_operation,p_input_schema_hash,p_output_schema_hash,
      p_step_units,p_estimated_cost_usd,p_estimated_tokens,LEAST(now_at+interval '15 minutes',run_created+make_interval(secs=>quota.max_run_duration_seconds)))
    RETURNING * INTO saved;
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_admit_capability_operation(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,NUMERIC,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_admit_capability_operation(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,NUMERIC,INTEGER) TO service_role;

CREATE FUNCTION public.platform_settle_capability_operation(
  p_workspace_id UUID,p_operation_id UUID,p_outcome TEXT,p_actual_tokens INTEGER DEFAULT NULL,p_actual_cost_usd NUMERIC DEFAULT NULL
)
RETURNS SETOF public.platform_capability_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_capability_reservations%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('consumed','released','expired') OR
    (p_outcome='consumed' AND (p_actual_tokens IS NULL OR p_actual_tokens NOT BETWEEN 0 AND 10000000 OR p_actual_cost_usd IS NULL OR p_actual_cost_usd<0)) OR
    (p_outcome<>'consumed' AND (p_actual_tokens IS NOT NULL OR p_actual_cost_usd IS NOT NULL)) THEN
    RAISE EXCEPTION 'Invalid capability settlement' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.platform_quota_limits WHERE workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace quota is not configured' USING ERRCODE='55000'; END IF;
  SELECT * INTO saved FROM public.platform_capability_reservations
    WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capability reservation not found' USING ERRCODE='P0002'; END IF;
  IF saved.status<>'reserved' THEN
    IF saved.status=p_outcome AND saved.actual_tokens IS NOT DISTINCT FROM p_actual_tokens
      AND saved.actual_cost_usd IS NOT DISTINCT FROM p_actual_cost_usd THEN RETURN NEXT saved; RETURN; END IF;
    RAISE EXCEPTION 'Capability settlement identity conflict' USING ERRCODE='40001';
  END IF;
  UPDATE public.platform_capability_reservations SET status=p_outcome,actual_tokens=p_actual_tokens,
    actual_cost_usd=p_actual_cost_usd,settled_at=clock_timestamp(),released_at=CASE WHEN p_outcome IN ('released','expired') THEN clock_timestamp() ELSE NULL END
    WHERE id=saved.id RETURNING * INTO saved;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    SELECT p_workspace_id,r.requested_by,'service','capability.operation.'||p_outcome,'capability_reservation',saved.id::TEXT,
      jsonb_build_object('operationId',p_operation_id,'actualTokens',p_actual_tokens,'actualCostUsd',p_actual_cost_usd)
    FROM public.platform_runs r WHERE r.id=saved.run_id AND r.workspace_id=p_workspace_id;
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_settle_capability_operation(UUID,UUID,TEXT,INTEGER,NUMERIC) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_settle_capability_operation(UUID,UUID,TEXT,INTEGER,NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.platform_cancel_run(p_actor_id UUID,p_workspace_id UUID,p_run_id UUID,p_expected_revision INTEGER)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_runs%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
  SELECT * INTO saved FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE='P0002'; END IF;
  IF p_expected_revision IS DISTINCT FROM saved.revision OR saved.status NOT IN ('ready','waiting','blocked') THEN
    RAISE EXCEPTION 'Run revision conflict' USING ERRCODE='40001';
  END IF;
  PERFORM 1 FROM public.platform_quota_limits WHERE workspace_id=p_workspace_id FOR UPDATE;
  UPDATE public.platform_runs SET status='cancelled',revision=revision+1,updated_at=now()
    WHERE id=saved.id RETURNING * INTO saved;
  UPDATE public.platform_checkpoints SET status='cancelled',revision=revision+1 WHERE run_id=saved.id AND status='pending';
  WITH released AS (
    UPDATE public.platform_capability_reservations SET status='released',settled_at=clock_timestamp(),released_at=clock_timestamp()
      WHERE workspace_id=p_workspace_id AND run_id=saved.id AND status='reserved'
      RETURNING id,operation_id
  )
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    SELECT p_workspace_id,p_actor_id,'user','capability.operation.released','capability_reservation',released.id::TEXT,
      jsonb_build_object('operationId',released.operation_id,'source','run_cancelled') FROM released;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id)
    VALUES(p_workspace_id,p_actor_id,'user','run.cancelled','platform_run',saved.id::TEXT);
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_cancel_run(UUID,UUID,UUID,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_cancel_run(UUID,UUID,UUID,INTEGER) TO service_role;
