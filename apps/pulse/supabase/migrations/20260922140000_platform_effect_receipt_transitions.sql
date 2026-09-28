-- Receipt transitions are evidence-only. Provider submission remains disabled.

CREATE OR REPLACE FUNCTION public.platform_transition_effect_receipt(
  p_receipt_id UUID, p_status TEXT, p_provider_receipt_ref TEXT, p_resolved_at TIMESTAMPTZ
)
RETURNS SETOF public.platform_effect_receipts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_effect_receipts%ROWTYPE; allowed BOOLEAN := false;
BEGIN
  SELECT * INTO saved FROM public.platform_effect_receipts WHERE id=p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Effect receipt not found' USING ERRCODE='P0002'; END IF;
  IF saved.checkpoint_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.platform_checkpoints WHERE id=saved.checkpoint_id AND run_id=saved.run_id
      AND workspace_id=saved.workspace_id AND type='effect_gate'
  ) THEN
    RAISE EXCEPTION 'Effect receipt requires an effect-gate checkpoint' USING ERRCODE='55000';
  END IF;
  allowed := (saved.status='prepared' AND p_status IN ('submitted','failed'))
    OR (saved.status='submitted' AND p_status IN ('accepted','unknown','failed'))
    OR (saved.status='unknown' AND p_status='reconciled');
  IF NOT allowed THEN RAISE EXCEPTION 'Invalid effect receipt transition' USING ERRCODE='40001'; END IF;
  IF p_status NOT IN ('prepared','submitted','accepted','unknown','failed','reconciled')
    OR (p_status IN ('accepted','failed','reconciled')) IS DISTINCT FROM (p_resolved_at IS NOT NULL)
    OR (p_status='accepted' AND p_provider_receipt_ref IS NULL)
    OR (p_provider_receipt_ref IS NOT NULL AND char_length(btrim(p_provider_receipt_ref)) NOT BETWEEN 1 AND 240) THEN
    RAISE EXCEPTION 'Invalid effect receipt resolution' USING ERRCODE='22023';
  END IF;
  UPDATE public.platform_effect_receipts SET status=p_status,provider_receipt_ref=COALESCE(p_provider_receipt_ref,provider_receipt_ref),resolved_at=p_resolved_at
    WHERE id=p_receipt_id RETURNING * INTO saved;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_transition_effect_receipt(UUID,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_transition_effect_receipt(UUID,TEXT,TEXT,TIMESTAMPTZ) TO service_role;
