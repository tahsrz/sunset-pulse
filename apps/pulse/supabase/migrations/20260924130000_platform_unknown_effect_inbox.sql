-- Bounded inbox read models for unknown effect recovery and latest exception review.
-- These are read-only projections; retry intents are not scheduler jobs.

CREATE FUNCTION public.platform_list_unknown_effects(
  p_actor_id UUID,p_workspace_id UUID,p_after TIMESTAMPTZ,p_after_id UUID,p_limit INTEGER
) RETURNS TABLE(
  receipt_id UUID,workspace_id UUID,run_id UUID,checkpoint_id UUID,operation_id UUID,
  operation_hash TEXT,target_hash TEXT,receipt_created_at TIMESTAMPTZ,
  provider_review_id UUID,provider_review_hash TEXT,
  recovery_review_id UUID,reconciliation_key UUID,recovery_outcome TEXT,evidence_source TEXT,
  evidence_reference TEXT,evidence_hash TEXT,recovery_actor_id UUID,recovery_created_at TIMESTAMPTZ,
  retry_intent_id UUID,retry_operation_id UUID,retry_created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member','reviewer','viewer']);
  IF p_limit NOT BETWEEN 1 AND 101 OR ((p_after IS NULL) <> (p_after_id IS NULL)) THEN
    RAISE EXCEPTION 'Invalid unknown effect page' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  SELECT receipt.id,receipt.workspace_id,receipt.run_id,receipt.checkpoint_id,receipt.operation_id,
    receipt.operation_hash,receipt.target_hash,receipt.created_at,
    reservation.provider_review_id,reservation.provider_contract_hash,
    recovery.id,recovery.reconciliation_key,recovery.outcome,recovery.evidence_source,
    recovery.evidence_reference,recovery.evidence_hash,recovery.actor_id,recovery.created_at,
    intent.id,intent.retry_operation_id,intent.created_at
  FROM public.platform_effect_receipts receipt
  LEFT JOIN LATERAL (
    SELECT r.provider_review_id,r.provider_contract_hash
    FROM public.platform_capability_reservations r
    WHERE r.workspace_id=receipt.workspace_id AND r.run_id=receipt.run_id AND r.operation_id=receipt.operation_id
    ORDER BY r.created_at DESC,r.id DESC LIMIT 1
  ) reservation ON TRUE
  LEFT JOIN LATERAL (
    SELECT review.* FROM public.platform_effect_recovery_reviews review
    WHERE review.workspace_id=receipt.workspace_id AND review.receipt_id=receipt.id
    ORDER BY review.created_at DESC,review.id DESC LIMIT 1
  ) recovery ON TRUE
  LEFT JOIN LATERAL (
    SELECT retry.* FROM public.platform_effect_retry_intents retry
    WHERE retry.workspace_id=receipt.workspace_id AND retry.receipt_id=receipt.id
      AND retry.recovery_review_id=recovery.id
    ORDER BY retry.created_at DESC,retry.id DESC LIMIT 1
  ) intent ON TRUE
  WHERE receipt.workspace_id=p_workspace_id AND receipt.status='unknown'
    AND (p_after IS NULL OR (receipt.created_at,receipt.id)<(p_after,p_after_id))
  ORDER BY receipt.created_at DESC,receipt.id DESC LIMIT p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_list_unknown_effects(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_unknown_effects(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) TO service_role;

DROP FUNCTION public.platform_list_provider_exceptions(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER);
CREATE FUNCTION public.platform_list_provider_exceptions(
  p_actor_id UUID,p_workspace_id UUID,p_after TIMESTAMPTZ,p_after_id UUID,p_limit INTEGER
) RETURNS TABLE(
  id UUID,workspace_id UUID,exception_type TEXT,provider_key TEXT,adapter_key TEXT,
  review_id UUID,connector_id UUID,run_id UUID,reservation_id UUID,operation_id UUID,
  occurred_at TIMESTAMPTZ,utc_day DATE,observed_cost_usd NUMERIC,configured_limit_usd NUMERIC,
  reviewed_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ,
  resolution_id UUID,resolution_reason TEXT,resolution_actor_id UUID,resolution_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member','reviewer','viewer']);
  IF p_limit NOT BETWEEN 1 AND 101 OR ((p_after IS NULL) <> (p_after_id IS NULL)) THEN
    RAISE EXCEPTION 'Invalid provider exception page' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  SELECT rows.id,rows.workspace_id,rows.exception_type,rows.provider_key,rows.adapter_key,
    rows.review_id,rows.connector_id,rows.run_id,rows.reservation_id,rows.operation_id,
    rows.occurred_at,rows.utc_day,rows.observed_cost_usd,rows.configured_limit_usd,
    rows.reviewed_at,rows.revoked_at,resolution.id,resolution.reason,resolution.actor_id,resolution.created_at
  FROM (
    SELECT breach.id,breach.workspace_id,'quota_breach'::TEXT AS exception_type,
      breach.provider_key,breach.adapter_key,reservation.provider_review_id AS review_id,
      review.connector_id,breach.run_id,breach.reservation_id,breach.operation_id,
      breach.created_at AS occurred_at,breach.utc_day,breach.observed_cost_usd,breach.configured_limit_usd,
      review.reviewed_at,review.revoked_at
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
  LEFT JOIN LATERAL (
    SELECT saved.id,saved.reason,saved.actor_id,saved.created_at
    FROM public.platform_provider_exception_resolutions saved
    WHERE saved.workspace_id=rows.workspace_id AND saved.exception_type=rows.exception_type AND saved.exception_id=rows.id
    ORDER BY saved.created_at DESC,saved.id DESC LIMIT 1
  ) resolution ON TRUE
  WHERE p_after IS NULL OR (rows.occurred_at,rows.id)<(p_after,p_after_id)
  ORDER BY rows.occurred_at DESC,rows.id DESC LIMIT p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_list_provider_exceptions(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_provider_exceptions(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) TO service_role;

COMMENT ON FUNCTION public.platform_list_unknown_effects(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) IS
  'Returns a bounded, workspace-authorized page of unknown effect receipts and latest recovery evidence/intent; no dispatch semantics.';
