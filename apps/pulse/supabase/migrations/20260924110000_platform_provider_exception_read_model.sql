-- Bounded, workspace-scoped exception feed for provider spend fences and
-- revoked adapter reviews. This is evidence-only; no action clears a fence.

ALTER TABLE public.platform_provider_quota_breaches
  ADD COLUMN reservation_id UUID REFERENCES public.platform_capability_reservations(id),
  ADD COLUMN run_id UUID REFERENCES public.platform_runs(id),
  ADD COLUMN operation_id UUID;

CREATE INDEX platform_provider_quota_breach_page_idx
  ON public.platform_provider_quota_breaches(workspace_id,created_at DESC,id DESC);
CREATE INDEX platform_provider_review_revoked_page_idx
  ON public.platform_provider_adapter_reviews(workspace_id,revoked_at DESC,id DESC)
  WHERE status='revoked';

CREATE OR REPLACE FUNCTION public.platform_record_provider_quota_breach()
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
    INSERT INTO public.platform_provider_quota_breaches(
      workspace_id,provider_key,adapter_key,utc_day,observed_cost_usd,configured_limit_usd,
      reservation_id,run_id,operation_id
    ) VALUES(
      NEW.workspace_id,NEW.provider_key,NEW.adapter_key,utc_today,usage_today,quota.max_daily_cost_usd,
      NEW.id,NEW.run_id,NEW.operation_id
    ) ON CONFLICT (workspace_id,provider_key,adapter_key,utc_day) DO NOTHING RETURNING id INTO breach_id;
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

CREATE FUNCTION public.platform_list_provider_exceptions(
  p_actor_id UUID,p_workspace_id UUID,p_after TIMESTAMPTZ,p_after_id UUID,p_limit INTEGER
)
RETURNS TABLE(
  id UUID,workspace_id UUID,exception_type TEXT,provider_key TEXT,adapter_key TEXT,
  review_id UUID,connector_id UUID,run_id UUID,reservation_id UUID,operation_id UUID,
  occurred_at TIMESTAMPTZ,utc_day DATE,observed_cost_usd NUMERIC,configured_limit_usd NUMERIC,
  reviewed_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member','reviewer','viewer']);
  IF p_limit NOT BETWEEN 1 AND 101 OR ((p_after IS NULL) <> (p_after_id IS NULL)) THEN
    RAISE EXCEPTION 'Invalid provider exception page' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  SELECT rows.* FROM (
    SELECT breach.id AS id,breach.workspace_id AS workspace_id,'quota_breach'::TEXT AS exception_type,
      breach.provider_key AS provider_key,breach.adapter_key AS adapter_key,
      reservation.provider_review_id AS review_id,review.connector_id AS connector_id,
      breach.run_id AS run_id,breach.reservation_id AS reservation_id,breach.operation_id AS operation_id,
      breach.created_at AS occurred_at,breach.utc_day AS utc_day,
      breach.observed_cost_usd AS observed_cost_usd,breach.configured_limit_usd AS configured_limit_usd,
      review.reviewed_at AS reviewed_at,review.revoked_at AS revoked_at
    FROM public.platform_provider_quota_breaches breach
    LEFT JOIN public.platform_capability_reservations reservation
      ON reservation.id=breach.reservation_id AND reservation.workspace_id=breach.workspace_id
    LEFT JOIN public.platform_provider_adapter_reviews review
      ON review.id=reservation.provider_review_id AND review.workspace_id=breach.workspace_id
    WHERE breach.workspace_id=p_workspace_id
    UNION ALL
    SELECT review.id,review.workspace_id,'review_revoked'::TEXT,review.provider_key,review.adapter_key,
      review.id,review.connector_id,reservation.run_id,reservation.id,reservation.operation_id,
      review.revoked_at,NULL::DATE,NULL::NUMERIC,NULL::NUMERIC,review.reviewed_at,review.revoked_at
    FROM public.platform_provider_adapter_reviews review
    LEFT JOIN LATERAL (
      SELECT candidate.run_id,candidate.id,candidate.operation_id
      FROM public.platform_capability_reservations candidate
      WHERE candidate.workspace_id=review.workspace_id AND candidate.provider_review_id=review.id
      ORDER BY candidate.created_at DESC,candidate.id DESC LIMIT 1
    ) reservation ON TRUE
    WHERE review.workspace_id=p_workspace_id AND review.status='revoked'
  ) rows
  WHERE p_after IS NULL OR (rows.occurred_at,rows.id)<(p_after,p_after_id)
  ORDER BY rows.occurred_at DESC,rows.id DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_list_provider_exceptions(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_provider_exceptions(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) TO service_role;

COMMENT ON FUNCTION public.platform_list_provider_exceptions(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) IS
  'Returns at most 101 safe provider quota/review exceptions for one authorized workspace and a stable time/id cursor.';
