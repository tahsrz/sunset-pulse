-- Serialize retry-intent creation per receipt so identical idempotent requests
-- cannot race on the independent workspace/retry-operation uniqueness index.
CREATE OR REPLACE FUNCTION public.platform_create_effect_retry_intent(
  p_actor_id UUID,p_workspace_id UUID,p_receipt_id UUID,p_recovery_review_id UUID,p_idempotency_key UUID,p_retry_operation_id UUID
) RETURNS SETOF public.platform_effect_retry_intents
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE receipt public.platform_effect_receipts%ROWTYPE; recovery public.platform_effect_recovery_reviews%ROWTYPE;
  saved public.platform_effect_retry_intents%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  -- A receipt is the serialization key for a retry request. The row lock makes
  -- the idempotency lookup below authoritative for concurrent retries.
  SELECT * INTO receipt FROM public.platform_effect_receipts
    WHERE workspace_id=p_workspace_id AND id=p_receipt_id FOR UPDATE;
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

  SELECT * INTO saved FROM public.platform_effect_retry_intents
    WHERE workspace_id=p_workspace_id AND receipt_id=p_receipt_id AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF FOUND THEN
    IF saved.actor_id<>p_actor_id OR saved.recovery_review_id<>p_recovery_review_id OR saved.retry_operation_id<>p_retry_operation_id THEN
      RAISE EXCEPTION 'Retry idempotency key reused with different identity' USING ERRCODE='23505';
    END IF;
    RETURN NEXT saved; RETURN;
  END IF;

  BEGIN
    INSERT INTO public.platform_effect_retry_intents(
      workspace_id,receipt_id,recovery_review_id,original_operation_id,retry_operation_id,
      provider_review_id,provider_review_hash,idempotency_key,actor_id
    ) VALUES(p_workspace_id,p_receipt_id,p_recovery_review_id,receipt.operation_id,p_retry_operation_id,
      recovery.provider_review_id,recovery.provider_review_hash,p_idempotency_key,p_actor_id)
    RETURNING * INTO saved;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Retry operation identity already exists' USING ERRCODE='23505';
  END;

  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','effect.retry.intent_created','effect_receipt',p_receipt_id::TEXT,
      jsonb_build_object('retryIntentId',saved.id,'originalOperationId',saved.original_operation_id,
        'retryOperationId',saved.retry_operation_id,'providerReviewId',saved.provider_review_id,'providerReviewHash',saved.provider_review_hash));
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_create_effect_retry_intent(UUID,UUID,UUID,UUID,UUID,UUID)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_create_effect_retry_intent(UUID,UUID,UUID,UUID,UUID,UUID)
  TO service_role;
