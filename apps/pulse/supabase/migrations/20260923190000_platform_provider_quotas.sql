-- Workspace-scoped provider/adapter admission limits and revocation.
-- This controls accounting reservations only; it does not enable dispatch.

ALTER TABLE public.platform_provider_adapter_reviews
  ADD COLUMN status TEXT NOT NULL DEFAULT 'reviewed' CHECK (status IN ('reviewed','revoked')),
  ADD COLUMN revoked_by UUID REFERENCES auth.users(id),
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD CONSTRAINT platform_provider_review_revocation_check CHECK (
    (status='reviewed' AND revoked_by IS NULL AND revoked_at IS NULL)
    OR (status='revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL)
  );

CREATE TABLE public.platform_provider_quota_limits (
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  provider_key TEXT NOT NULL CHECK (provider_key ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  adapter_key TEXT NOT NULL CHECK (adapter_key ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  max_concurrent_operations INTEGER NOT NULL CHECK (max_concurrent_operations BETWEEN 1 AND 1000),
  max_reserved_cost_usd NUMERIC(12,6) NOT NULL CHECK (max_reserved_cost_usd BETWEEN 0 AND 999999.999999),
  max_daily_cost_usd NUMERIC(12,6) NOT NULL CHECK (max_daily_cost_usd BETWEEN 0 AND 999999.999999),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,provider_key,adapter_key)
);
ALTER TABLE public.platform_provider_quota_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_provider_quota_limits_read ON public.platform_provider_quota_limits FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_provider_quota_limits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.platform_provider_quota_limits TO authenticated,service_role;

CREATE TABLE public.platform_provider_quota_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  provider_key TEXT NOT NULL,
  adapter_key TEXT NOT NULL,
  utc_day DATE NOT NULL,
  observed_cost_usd NUMERIC(12,6) NOT NULL CHECK (observed_cost_usd>=0),
  configured_limit_usd NUMERIC(12,6) NOT NULL CHECK (configured_limit_usd>=0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (workspace_id,provider_key,adapter_key,utc_day),
  FOREIGN KEY (workspace_id,provider_key,adapter_key)
    REFERENCES public.platform_provider_quota_limits(workspace_id,provider_key,adapter_key)
);
ALTER TABLE public.platform_provider_quota_breaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_provider_quota_breaches_read ON public.platform_provider_quota_breaches FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_provider_quota_breaches FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.platform_provider_quota_breaches TO authenticated,service_role;

ALTER TABLE public.platform_capability_reservations
  ADD COLUMN provider_key TEXT,
  ADD COLUMN adapter_key TEXT,
  ADD CONSTRAINT platform_reservation_provider_identity_check CHECK (
    (provider_review_id IS NULL AND provider_key IS NULL AND adapter_key IS NULL)
    OR (provider_review_id IS NOT NULL AND provider_key ~ '^[a-z][a-z0-9_.:-]{0,127}$'
      AND adapter_key ~ '^[a-z][a-z0-9_.:-]{0,127}$')
  );
CREATE INDEX platform_provider_reservations_usage_idx
  ON public.platform_capability_reservations(workspace_id,provider_key,adapter_key,status,created_at)
  WHERE provider_review_id IS NOT NULL;

CREATE FUNCTION public.platform_save_provider_quota(
  p_actor_id UUID,p_workspace_id UUID,p_provider_key TEXT,p_adapter_key TEXT,
  p_max_concurrent_operations INTEGER,p_max_reserved_cost_usd NUMERIC,p_max_daily_cost_usd NUMERIC,
  p_expected_revision INTEGER
)
RETURNS SETOF public.platform_provider_quota_limits LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_provider_quota_limits%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_provider_key !~ '^[a-z][a-z0-9_.:-]{0,127}$' OR p_adapter_key !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_max_concurrent_operations NOT BETWEEN 1 AND 1000
    OR p_max_reserved_cost_usd IS NULL OR p_max_reserved_cost_usd NOT BETWEEN 0 AND 999999.999999
    OR p_max_daily_cost_usd IS NULL OR p_max_daily_cost_usd NOT BETWEEN 0 AND 999999.999999 THEN
    RAISE EXCEPTION 'Invalid provider quota' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_provider_adapter_reviews
    WHERE workspace_id=p_workspace_id AND provider_key=p_provider_key AND adapter_key=p_adapter_key AND status='reviewed') THEN
    RAISE EXCEPTION 'No active reviewed provider adapter exists' USING ERRCODE='55000';
  END IF;
  SELECT * INTO saved FROM public.platform_provider_quota_limits
    WHERE workspace_id=p_workspace_id AND provider_key=p_provider_key AND adapter_key=p_adapter_key FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Provider quota revision conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.platform_provider_quota_limits(workspace_id,provider_key,adapter_key,max_concurrent_operations,
      max_reserved_cost_usd,max_daily_cost_usd,updated_by)
      VALUES(p_workspace_id,p_provider_key,p_adapter_key,p_max_concurrent_operations,p_max_reserved_cost_usd,p_max_daily_cost_usd,p_actor_id)
      RETURNING * INTO saved;
  ELSE
    IF p_expected_revision IS DISTINCT FROM saved.revision THEN RAISE EXCEPTION 'Provider quota revision conflict' USING ERRCODE='40001'; END IF;
    UPDATE public.platform_provider_quota_limits SET max_concurrent_operations=p_max_concurrent_operations,
      max_reserved_cost_usd=p_max_reserved_cost_usd,max_daily_cost_usd=p_max_daily_cost_usd,
      revision=revision+1,updated_by=p_actor_id,updated_at=now()
      WHERE workspace_id=p_workspace_id AND provider_key=p_provider_key AND adapter_key=p_adapter_key
      RETURNING * INTO saved;
  END IF;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','provider.quota.updated','provider_quota',p_provider_key||':'||p_adapter_key,
      jsonb_build_object('revision',saved.revision,'maxConcurrentOperations',saved.max_concurrent_operations,
        'maxReservedCostUsd',saved.max_reserved_cost_usd,'maxDailyCostUsd',saved.max_daily_cost_usd));
  RETURN NEXT saved;
END;
$$;

CREATE FUNCTION public.platform_revoke_provider_adapter_review(p_actor_id UUID,p_workspace_id UUID,p_review_id UUID)
RETURNS SETOF public.platform_provider_adapter_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_provider_adapter_reviews%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  SELECT * INTO saved FROM public.platform_provider_adapter_reviews
    WHERE workspace_id=p_workspace_id AND id=p_review_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider review not found' USING ERRCODE='P0002'; END IF;
  IF saved.status='reviewed' THEN
    UPDATE public.platform_provider_adapter_reviews SET status='revoked',revoked_by=p_actor_id,revoked_at=clock_timestamp()
      WHERE id=saved.id RETURNING * INTO saved;
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
      VALUES(p_workspace_id,p_actor_id,'user','provider.adapter.revoked','connector_provider_adapter',saved.id::TEXT,
        jsonb_build_object('providerKey',saved.provider_key,'adapterKey',saved.adapter_key,
          'adapterVersion',saved.adapter_version,'contractHash',saved.contract_hash));
  END IF;
  RETURN NEXT saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_pin_provider_review_on_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE connector public.platform_connector_definitions%ROWTYPE; review public.platform_provider_adapter_reviews%ROWTYPE;
  quota public.platform_provider_quota_limits%ROWTYPE; utc_today DATE := (clock_timestamp() AT TIME ZONE 'UTC')::DATE;
  daily_actual NUMERIC(12,6); reserved_cost NUMERIC(12,6); reserved_count INTEGER; minimum_reserve NUMERIC(12,6);
BEGIN
  SELECT * INTO connector FROM public.platform_connector_definitions
    WHERE workspace_id=NEW.workspace_id AND connection_id=NEW.connection_id AND status='reviewed' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reviewed connector not found for reservation' USING ERRCODE='55000'; END IF;
  IF connector.provider_review_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO review FROM public.platform_provider_adapter_reviews
    WHERE workspace_id=NEW.workspace_id AND id=connector.provider_review_id FOR SHARE;
  IF NOT FOUND OR review.status<>'reviewed' OR review.contract_hash<>connector.provider_contract_hash THEN
    RAISE EXCEPTION 'Provider adapter review is missing, revoked, or stale' USING ERRCODE='55000';
  END IF;
  SELECT * INTO quota FROM public.platform_provider_quota_limits
    WHERE workspace_id=NEW.workspace_id AND provider_key=review.provider_key AND adapter_key=review.adapter_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider quota is not configured' USING ERRCODE='55000'; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_provider_quota_breaches
    WHERE workspace_id=NEW.workspace_id AND provider_key=review.provider_key AND adapter_key=review.adapter_key AND utc_day=utc_today) THEN
    RAISE EXCEPTION 'Provider adapter is fenced for the current UTC day after a quota breach' USING ERRCODE='55P03';
  END IF;

  minimum_reserve:=((review.contract->>'maxCostMicrosPerOperation')::NUMERIC/1000000)::NUMERIC(12,6);
  IF NEW.estimated_cost_usd<minimum_reserve THEN
    RAISE EXCEPTION 'Reservation is below the reviewed maximum provider operation cost' USING ERRCODE='55P03';
  END IF;
  SELECT count(*)::INTEGER,COALESCE(sum(estimated_cost_usd),0)::NUMERIC(12,6)
    INTO reserved_count,reserved_cost FROM public.platform_capability_reservations
    WHERE workspace_id=NEW.workspace_id AND provider_key=review.provider_key AND adapter_key=review.adapter_key AND status='reserved';
  SELECT COALESCE(sum(actual_cost_usd),0)::NUMERIC(12,6) INTO daily_actual
    FROM public.platform_capability_reservations
    WHERE workspace_id=NEW.workspace_id AND provider_key=review.provider_key AND adapter_key=review.adapter_key
      AND status='consumed' AND settled_at >= (utc_today::TIMESTAMP AT TIME ZONE 'UTC')
      AND settled_at < ((utc_today+1)::TIMESTAMP AT TIME ZONE 'UTC');
  IF reserved_count>=quota.max_concurrent_operations
    OR reserved_cost+NEW.estimated_cost_usd>quota.max_reserved_cost_usd
    OR daily_actual+reserved_cost+NEW.estimated_cost_usd>quota.max_daily_cost_usd THEN
    RAISE EXCEPTION 'Provider quota exceeded' USING ERRCODE='55P03';
  END IF;
  NEW.provider_review_id:=review.id;
  NEW.provider_contract_hash:=review.contract_hash;
  NEW.provider_key:=review.provider_key;
  NEW.adapter_key:=review.adapter_key;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.platform_record_provider_quota_breach()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE quota public.platform_provider_quota_limits%ROWTYPE; usage_today NUMERIC(12,6);
  utc_today DATE := (clock_timestamp() AT TIME ZONE 'UTC')::DATE; breach_id UUID;
BEGIN
  IF NEW.status<>'consumed' OR OLD.status='consumed' OR NEW.provider_review_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO quota FROM public.platform_provider_quota_limits
    WHERE workspace_id=NEW.workspace_id AND provider_key=NEW.provider_key AND adapter_key=NEW.adapter_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Provider quota disappeared during settlement' USING ERRCODE='55000'; END IF;
  SELECT COALESCE(sum(actual_cost_usd),0)::NUMERIC(12,6) INTO usage_today
    FROM public.platform_capability_reservations
    WHERE workspace_id=NEW.workspace_id AND provider_key=NEW.provider_key AND adapter_key=NEW.adapter_key
      AND status='consumed' AND settled_at >= (utc_today::TIMESTAMP AT TIME ZONE 'UTC')
      AND settled_at < ((utc_today+1)::TIMESTAMP AT TIME ZONE 'UTC');
  IF usage_today>quota.max_daily_cost_usd THEN
    INSERT INTO public.platform_provider_quota_breaches(workspace_id,provider_key,adapter_key,utc_day,observed_cost_usd,configured_limit_usd)
      VALUES(NEW.workspace_id,NEW.provider_key,NEW.adapter_key,utc_today,usage_today,quota.max_daily_cost_usd)
      ON CONFLICT (workspace_id,provider_key,adapter_key,utc_day) DO NOTHING RETURNING id INTO breach_id;
    IF breach_id IS NOT NULL THEN
      INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
        SELECT NEW.workspace_id,run.requested_by,'service','provider.quota.breached','provider_quota',NEW.provider_key||':'||NEW.adapter_key,
          jsonb_build_object('breachId',breach_id,'utcDay',utc_today,'observedCostUsd',usage_today,
            'configuredLimitUsd',quota.max_daily_cost_usd,'operationId',NEW.operation_id)
        FROM public.platform_runs run WHERE run.id=NEW.run_id AND run.workspace_id=NEW.workspace_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_pin_provider_review_on_reservation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.platform_record_provider_quota_breach() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER platform_reservation_record_provider_quota_breach
  AFTER UPDATE OF status ON public.platform_capability_reservations
  FOR EACH ROW EXECUTE FUNCTION public.platform_record_provider_quota_breach();

REVOKE ALL ON FUNCTION public.platform_save_provider_quota(UUID,UUID,TEXT,TEXT,INTEGER,NUMERIC,NUMERIC,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_save_provider_quota(UUID,UUID,TEXT,TEXT,INTEGER,NUMERIC,NUMERIC,INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.platform_revoke_provider_adapter_review(UUID,UUID,UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_revoke_provider_adapter_review(UUID,UUID,UUID) TO service_role;

COMMENT ON TABLE public.platform_provider_quota_limits IS
  'Workspace-scoped transactional ceilings for concurrent, reserved and UTC-day actual usage by reviewed provider adapter.';
COMMENT ON TABLE public.platform_provider_quota_breaches IS
  'Immutable UTC-day provider spend breach evidence. A breach blocks further reservations for that provider/adapter until the next UTC day.';
