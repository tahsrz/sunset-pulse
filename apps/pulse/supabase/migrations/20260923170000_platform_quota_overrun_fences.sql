-- Persist estimate/budget overruns as immutable run evidence and fence new
-- reservations for that run. Accounting only: provider dispatch stays off.

ALTER TABLE public.platform_capability_reservations
  ADD CONSTRAINT platform_capability_reservations_workspace_id_id_key UNIQUE (workspace_id,id);

CREATE TABLE public.platform_quota_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  run_id UUID NOT NULL REFERENCES public.platform_runs(id),
  reservation_id UUID NOT NULL REFERENCES public.platform_capability_reservations(id),
  operation_id UUID NOT NULL,
  breach_kind TEXT NOT NULL CHECK (breach_kind IN (
    'estimated_cost_exceeded','estimated_tokens_exceeded',
    'run_cost_budget_exceeded','run_token_budget_exceeded'
  )),
  observed_cost_usd NUMERIC(12,6) NOT NULL CHECK (observed_cost_usd >= 0),
  observed_tokens INTEGER NOT NULL CHECK (observed_tokens BETWEEN 0 AND 10000000),
  configured_limit NUMERIC(12,6) NOT NULL CHECK (configured_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (workspace_id, operation_id, breach_kind),
  FOREIGN KEY (workspace_id, run_id) REFERENCES public.platform_runs(workspace_id, id),
  FOREIGN KEY (workspace_id, reservation_id) REFERENCES public.platform_capability_reservations(workspace_id, id)
);
CREATE INDEX platform_quota_breaches_run_idx
  ON public.platform_quota_breaches(workspace_id, run_id, created_at, id);
ALTER TABLE public.platform_quota_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_quota_breaches_read ON public.platform_quota_breaches FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_quota_breaches FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_quota_breaches TO authenticated, service_role;

CREATE FUNCTION public.platform_record_quota_breaches()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE quota public.platform_quota_limits%ROWTYPE; run_cost NUMERIC(12,6); run_tokens BIGINT;
BEGIN
  IF NEW.status <> 'consumed' OR OLD.status = 'consumed' THEN RETURN NEW; END IF;
  SELECT * INTO quota FROM public.platform_quota_limits
    WHERE workspace_id=NEW.workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace quota is not configured' USING ERRCODE='55000'; END IF;

  SELECT COALESCE(sum(actual_cost_usd),0),COALESCE(sum(actual_tokens),0)
    INTO run_cost,run_tokens
    FROM public.platform_capability_reservations
    WHERE workspace_id=NEW.workspace_id AND run_id=NEW.run_id AND status='consumed';

  INSERT INTO public.platform_quota_breaches(
    workspace_id,run_id,reservation_id,operation_id,breach_kind,
    observed_cost_usd,observed_tokens,configured_limit
  )
  SELECT NEW.workspace_id,NEW.run_id,NEW.id,NEW.operation_id,breach.kind,
    run_cost::NUMERIC(12,6),run_tokens::INTEGER,breach.limit_value
  FROM (VALUES
    ('estimated_cost_exceeded'::TEXT, NEW.actual_cost_usd > NEW.estimated_cost_usd, NEW.estimated_cost_usd),
    ('estimated_tokens_exceeded'::TEXT, NEW.actual_tokens > NEW.estimated_tokens, NEW.estimated_tokens),
    ('run_cost_budget_exceeded'::TEXT, run_cost > quota.max_run_estimated_cost_usd, quota.max_run_estimated_cost_usd),
    ('run_token_budget_exceeded'::TEXT, run_tokens > quota.max_tokens_per_run, quota.max_tokens_per_run::NUMERIC)
  ) AS breach(kind,exceeded,limit_value)
  WHERE breach.exceeded
  ON CONFLICT (workspace_id,operation_id,breach_kind) DO NOTHING;

  INSERT INTO public.platform_audit_events(
    workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata
  )
  SELECT NEW.workspace_id,run.requested_by,'service','capability.budget_breached',
    'platform_run',NEW.run_id::TEXT,
    jsonb_build_object('operationId',NEW.operation_id,'reservationId',breach.reservation_id,
      'breachKind',breach.breach_kind,'observedCostUsd',breach.observed_cost_usd,
      'observedTokens',breach.observed_tokens,'configuredLimit',breach.configured_limit)
  FROM public.platform_quota_breaches breach
  JOIN public.platform_runs run ON run.id=breach.run_id AND run.workspace_id=breach.workspace_id
  WHERE breach.workspace_id=NEW.workspace_id AND breach.operation_id=NEW.operation_id
    AND breach.created_at >= transaction_timestamp()
    AND breach.reservation_id=NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_record_quota_breaches() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER platform_capability_reservation_record_quota_breaches
  AFTER UPDATE OF status ON public.platform_capability_reservations
  FOR EACH ROW EXECUTE FUNCTION public.platform_record_quota_breaches();

CREATE FUNCTION public.platform_block_reservation_after_quota_breach()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.platform_quota_breaches
    WHERE workspace_id=NEW.workspace_id AND run_id=NEW.run_id) THEN
    RAISE EXCEPTION 'Capability run is fenced after a quota breach' USING ERRCODE='55P03';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_block_reservation_after_quota_breach() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER platform_capability_reservation_quota_breach_fence
  BEFORE INSERT ON public.platform_capability_reservations
  FOR EACH ROW EXECUTE FUNCTION public.platform_block_reservation_after_quota_breach();

COMMENT ON TABLE public.platform_quota_breaches IS
  'Immutable evidence of actual capability usage exceeding its reservation estimate or run budget. Any breach fences subsequent capability reservations for that run.';
