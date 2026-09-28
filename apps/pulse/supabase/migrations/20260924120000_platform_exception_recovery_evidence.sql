-- Append-only exception resolutions and unknown-effect recovery identities.
-- This records operator evidence only; it does not enqueue or dispatch a provider call.

ALTER TABLE public.platform_effect_receipts ADD CONSTRAINT platform_effect_receipts_workspace_id_id_key UNIQUE(workspace_id,id);

CREATE TABLE public.platform_provider_exception_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  exception_type TEXT NOT NULL CHECK (exception_type IN ('quota_breach','review_revoked')),
  exception_id UUID NOT NULL,
  resolution_key UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (reason IN ('investigated','provider_lookup_complete','manual_review_complete','not_retryable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,exception_type,exception_id,resolution_key)
);
CREATE INDEX platform_provider_exception_resolution_page_idx
  ON public.platform_provider_exception_resolutions(workspace_id,exception_type,exception_id,created_at DESC,id DESC);
ALTER TABLE public.platform_provider_exception_resolutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_provider_exception_resolutions FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE public.platform_effect_recovery_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  receipt_id UUID NOT NULL REFERENCES public.platform_effect_receipts(id),
  original_operation_id UUID NOT NULL,
  provider_review_id UUID,
  provider_review_hash TEXT CHECK (provider_review_hash IS NULL OR provider_review_hash ~ '^[a-f0-9]{64}$'),
  reconciliation_key UUID NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('applied','not_applied')),
  evidence_source TEXT NOT NULL CHECK (evidence_source IN ('provider_lookup','manual_review')),
  evidence_reference TEXT NOT NULL CHECK (evidence_reference ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$'),
  evidence_hash TEXT NOT NULL CHECK (evidence_hash ~ '^[a-f0-9]{64}$'),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,receipt_id) REFERENCES public.platform_effect_receipts(workspace_id,id),
  FOREIGN KEY (workspace_id,provider_review_id) REFERENCES public.platform_provider_adapter_reviews(workspace_id,id),
  CHECK ((provider_review_id IS NULL) = (provider_review_hash IS NULL)),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,receipt_id,reconciliation_key)
);
CREATE INDEX platform_effect_recovery_review_page_idx
  ON public.platform_effect_recovery_reviews(workspace_id,receipt_id,created_at DESC,id DESC);
ALTER TABLE public.platform_effect_recovery_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_effect_recovery_reviews FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE public.platform_effect_retry_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  receipt_id UUID NOT NULL REFERENCES public.platform_effect_receipts(id),
  recovery_review_id UUID NOT NULL REFERENCES public.platform_effect_recovery_reviews(id),
  original_operation_id UUID NOT NULL,
  retry_operation_id UUID NOT NULL,
  provider_review_id UUID NOT NULL,
  provider_review_hash TEXT NOT NULL CHECK (provider_review_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key UUID NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,receipt_id) REFERENCES public.platform_effect_receipts(workspace_id,id),
  FOREIGN KEY (workspace_id,recovery_review_id) REFERENCES public.platform_effect_recovery_reviews(workspace_id,id),
  FOREIGN KEY (workspace_id,provider_review_id) REFERENCES public.platform_provider_adapter_reviews(workspace_id,id),
  CHECK (retry_operation_id <> original_operation_id),
  UNIQUE (workspace_id,retry_operation_id),
  UNIQUE (workspace_id,receipt_id,idempotency_key)
);
CREATE INDEX platform_effect_retry_intent_page_idx
  ON public.platform_effect_retry_intents(workspace_id,receipt_id,created_at DESC,id DESC);
ALTER TABLE public.platform_effect_retry_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_effect_retry_intents FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.platform_resolve_provider_exception(
  p_actor_id UUID,p_workspace_id UUID,p_exception_type TEXT,p_exception_id UUID,p_resolution_key UUID,p_reason TEXT
) RETURNS SETOF public.platform_provider_exception_resolutions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_provider_exception_resolutions%ROWTYPE; inserted BOOLEAN := false;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_reason NOT IN ('investigated','provider_lookup_complete','manual_review_complete','not_retryable') THEN
    RAISE EXCEPTION 'Invalid exception resolution' USING ERRCODE='22023';
  END IF;
  IF (p_exception_type='quota_breach' AND NOT EXISTS (
      SELECT 1 FROM public.platform_provider_quota_breaches WHERE workspace_id=p_workspace_id AND id=p_exception_id
    )) OR (p_exception_type='review_revoked' AND NOT EXISTS (
      SELECT 1 FROM public.platform_provider_adapter_reviews WHERE workspace_id=p_workspace_id AND id=p_exception_id AND status='revoked'
    )) OR p_exception_type NOT IN ('quota_breach','review_revoked') THEN
    RAISE EXCEPTION 'Provider exception not found' USING ERRCODE='P0002';
  END IF;
  INSERT INTO public.platform_provider_exception_resolutions(workspace_id,exception_type,exception_id,resolution_key,actor_id,reason)
    VALUES(p_workspace_id,p_exception_type,p_exception_id,p_resolution_key,p_actor_id,p_reason)
    ON CONFLICT (workspace_id,exception_type,exception_id,resolution_key) DO NOTHING
    RETURNING * INTO saved;
  inserted := FOUND;
  IF NOT FOUND THEN
    SELECT * INTO saved FROM public.platform_provider_exception_resolutions
      WHERE workspace_id=p_workspace_id AND exception_type=p_exception_type AND exception_id=p_exception_id AND resolution_key=p_resolution_key;
    IF saved.actor_id<>p_actor_id OR saved.reason<>p_reason THEN
      RAISE EXCEPTION 'Resolution key reused with different content' USING ERRCODE='23505';
    END IF;
  END IF;
  IF inserted THEN INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','provider.exception.resolved',p_exception_type,p_exception_id::TEXT,
      jsonb_build_object('resolutionId',saved.id,'resolutionKey',saved.resolution_key,'reason',saved.reason)); END IF;
  RETURN NEXT saved;
END;
$$;

CREATE FUNCTION public.platform_record_effect_recovery_review(
  p_actor_id UUID,p_workspace_id UUID,p_receipt_id UUID,p_reconciliation_key UUID,
  p_outcome TEXT,p_evidence_source TEXT,p_evidence_reference TEXT,p_evidence_hash TEXT
) RETURNS SETOF public.platform_effect_recovery_reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE receipt public.platform_effect_receipts%ROWTYPE; reservation public.platform_capability_reservations%ROWTYPE;
  saved public.platform_effect_recovery_reviews%ROWTYPE; inserted BOOLEAN := false;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  SELECT * INTO receipt FROM public.platform_effect_receipts WHERE workspace_id=p_workspace_id AND id=p_receipt_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Effect receipt not found' USING ERRCODE='P0002'; END IF;
  IF receipt.status<>'unknown' THEN RAISE EXCEPTION 'Only unknown outcomes can be reconciled' USING ERRCODE='40001'; END IF;
  IF receipt.checkpoint_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_checkpoints WHERE id=receipt.checkpoint_id AND run_id=receipt.run_id
      AND workspace_id=p_workspace_id AND type='effect_gate'
  ) THEN RAISE EXCEPTION 'Unknown receipt must belong to an effect gate' USING ERRCODE='55000'; END IF;
  IF p_outcome NOT IN ('applied','not_applied') OR p_evidence_source NOT IN ('provider_lookup','manual_review')
    OR p_evidence_reference !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$'
    OR p_evidence_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid recovery evidence' USING ERRCODE='22023'; END IF;
  SELECT * INTO reservation FROM public.platform_capability_reservations
    WHERE workspace_id=p_workspace_id AND run_id=receipt.run_id AND operation_id=receipt.operation_id
    ORDER BY created_at DESC,id DESC LIMIT 1;
  INSERT INTO public.platform_effect_recovery_reviews(
    workspace_id,receipt_id,original_operation_id,provider_review_id,provider_review_hash,
    reconciliation_key,outcome,evidence_source,evidence_reference,evidence_hash,actor_id
  ) VALUES(p_workspace_id,p_receipt_id,receipt.operation_id,reservation.provider_review_id,reservation.provider_contract_hash,
    p_reconciliation_key,p_outcome,p_evidence_source,p_evidence_reference,p_evidence_hash,p_actor_id)
  ON CONFLICT (workspace_id,receipt_id,reconciliation_key) DO NOTHING RETURNING * INTO saved;
  inserted := FOUND;
  IF NOT FOUND THEN
    SELECT * INTO saved FROM public.platform_effect_recovery_reviews
      WHERE workspace_id=p_workspace_id AND receipt_id=p_receipt_id AND reconciliation_key=p_reconciliation_key;
    IF saved.actor_id<>p_actor_id OR saved.outcome<>p_outcome OR saved.evidence_source<>p_evidence_source
      OR saved.evidence_reference<>p_evidence_reference OR saved.evidence_hash<>p_evidence_hash THEN
      RAISE EXCEPTION 'Reconciliation key reused with different evidence' USING ERRCODE='23505';
    END IF;
  END IF;
  IF inserted THEN INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','effect.recovery.reviewed','effect_receipt',p_receipt_id::TEXT,
      jsonb_build_object('reviewId',saved.id,'operationId',saved.original_operation_id,'outcome',saved.outcome,'evidenceHash',saved.evidence_hash)); END IF;
  RETURN NEXT saved;
END;
$$;

CREATE FUNCTION public.platform_create_effect_retry_intent(
  p_actor_id UUID,p_workspace_id UUID,p_receipt_id UUID,p_recovery_review_id UUID,p_idempotency_key UUID,p_retry_operation_id UUID
) RETURNS SETOF public.platform_effect_retry_intents
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE receipt public.platform_effect_receipts%ROWTYPE; recovery public.platform_effect_recovery_reviews%ROWTYPE;
  saved public.platform_effect_retry_intents%ROWTYPE; inserted BOOLEAN := false;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  SELECT * INTO receipt FROM public.platform_effect_receipts WHERE workspace_id=p_workspace_id AND id=p_receipt_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Effect receipt not found' USING ERRCODE='P0002'; END IF;
  IF receipt.checkpoint_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_checkpoints WHERE id=receipt.checkpoint_id AND run_id=receipt.run_id
      AND workspace_id=p_workspace_id AND type='effect_gate'
  ) THEN RAISE EXCEPTION 'Retry intent must reference an effect-gate receipt' USING ERRCODE='55000'; END IF;
  SELECT * INTO recovery FROM public.platform_effect_recovery_reviews
    WHERE workspace_id=p_workspace_id AND id=p_recovery_review_id AND receipt_id=p_receipt_id FOR SHARE;
  IF NOT FOUND OR recovery.outcome<>'not_applied' OR receipt.status<>'unknown' OR recovery.original_operation_id<>receipt.operation_id THEN
    RAISE EXCEPTION 'Recovery evidence does not authorize a retry intent' USING ERRCODE='55000';
  END IF;
  IF recovery.provider_review_id IS NULL OR recovery.provider_review_hash IS NULL THEN
    RAISE EXCEPTION 'Pinned provider review is unavailable for retry' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_provider_adapter_reviews
    WHERE workspace_id=p_workspace_id AND id=recovery.provider_review_id AND status='reviewed'
      AND contract_hash=recovery.provider_review_hash) THEN
    RAISE EXCEPTION 'Pinned provider review is no longer active' USING ERRCODE='55000';
  END IF;
  INSERT INTO public.platform_effect_retry_intents(
    workspace_id,receipt_id,recovery_review_id,original_operation_id,retry_operation_id,
    provider_review_id,provider_review_hash,idempotency_key,actor_id
  ) VALUES(p_workspace_id,p_receipt_id,p_recovery_review_id,receipt.operation_id,p_retry_operation_id,
    recovery.provider_review_id,recovery.provider_review_hash,p_idempotency_key,p_actor_id)
  ON CONFLICT (workspace_id,receipt_id,idempotency_key) DO NOTHING RETURNING * INTO saved;
  inserted := FOUND;
  IF NOT FOUND THEN
    SELECT * INTO saved FROM public.platform_effect_retry_intents
      WHERE workspace_id=p_workspace_id AND receipt_id=p_receipt_id AND idempotency_key=p_idempotency_key;
    IF saved.actor_id<>p_actor_id OR saved.recovery_review_id<>p_recovery_review_id OR saved.retry_operation_id<>p_retry_operation_id THEN
      RAISE EXCEPTION 'Retry idempotency key reused with different identity' USING ERRCODE='23505';
    END IF;
  END IF;
  IF inserted THEN INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','effect.retry.intent_created','effect_receipt',p_receipt_id::TEXT,
      jsonb_build_object('retryIntentId',saved.id,'originalOperationId',saved.original_operation_id,
        'retryOperationId',saved.retry_operation_id,'providerReviewId',saved.provider_review_id,'providerReviewHash',saved.provider_review_hash)); END IF;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_resolve_provider_exception(UUID,UUID,TEXT,UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.platform_record_effect_recovery_review(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.platform_create_effect_retry_intent(UUID,UUID,UUID,UUID,UUID,UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_resolve_provider_exception(UUID,UUID,TEXT,UUID,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_effect_recovery_review(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_create_effect_retry_intent(UUID,UUID,UUID,UUID,UUID,UUID) TO service_role;
