-- Persist owner/admin-reviewed adapter pricing/idempotency contracts and pin
-- their exact hashes to connectors and future capability reservations.
-- Registration is metadata-only; provider dispatch remains disabled.

ALTER TABLE public.platform_connector_definitions
  ADD CONSTRAINT platform_connector_definitions_workspace_id_id_key UNIQUE (workspace_id,id);

CREATE TABLE public.platform_provider_adapter_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  connector_id UUID NOT NULL,
  provider_key TEXT NOT NULL CHECK (provider_key ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  adapter_key TEXT NOT NULL CHECK (adapter_key ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  adapter_version TEXT NOT NULL CHECK (adapter_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  contract JSONB NOT NULL CHECK (jsonb_typeof(contract)='object' AND octet_length(contract::TEXT)<=65536),
  contract_hash TEXT NOT NULL CHECK (contract_hash ~ '^[a-f0-9]{64}$'),
  reviewed_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,id),
  UNIQUE (workspace_id,connector_id,adapter_key,adapter_version),
  FOREIGN KEY (workspace_id,connector_id) REFERENCES public.platform_connector_definitions(workspace_id,id),
  CHECK (contract->>'schemaVersion'='1' AND contract->>'currency'='USD'),
  CHECK (contract->>'providerKey'=provider_key AND contract->>'adapterKey'=adapter_key
    AND contract->>'adapterVersion'=adapter_version AND contract->>'reviewedBy'=reviewed_by::TEXT)
);
ALTER TABLE public.platform_provider_adapter_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_provider_adapter_reviews_read ON public.platform_provider_adapter_reviews FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_provider_adapter_reviews FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_provider_adapter_reviews TO authenticated, service_role;

ALTER TABLE public.platform_connector_definitions
  ADD COLUMN provider_review_id UUID,
  ADD COLUMN provider_contract_hash TEXT,
  ADD CONSTRAINT platform_connector_provider_review_pair_check CHECK (
    (provider_review_id IS NULL AND provider_contract_hash IS NULL)
    OR (provider_review_id IS NOT NULL AND provider_contract_hash IS NOT NULL AND provider_contract_hash ~ '^[a-f0-9]{64}$')
  ),
  ADD CONSTRAINT platform_connector_provider_review_fk FOREIGN KEY (workspace_id,provider_review_id)
    REFERENCES public.platform_provider_adapter_reviews(workspace_id,id);

ALTER TABLE public.platform_capability_reservations
  ADD COLUMN provider_review_id UUID,
  ADD COLUMN provider_contract_hash TEXT,
  ADD CONSTRAINT platform_reservation_provider_review_pair_check CHECK (
    (provider_review_id IS NULL AND provider_contract_hash IS NULL)
    OR (provider_review_id IS NOT NULL AND provider_contract_hash IS NOT NULL AND provider_contract_hash ~ '^[a-f0-9]{64}$')
  ),
  ADD CONSTRAINT platform_reservation_provider_review_fk FOREIGN KEY (workspace_id,provider_review_id)
    REFERENCES public.platform_provider_adapter_reviews(workspace_id,id);

CREATE FUNCTION public.platform_clear_provider_review_on_connector_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.protocol IS DISTINCT FROM OLD.protocol OR NEW.endpoint IS DISTINCT FROM OLD.endpoint
    OR NEW.auth_ref IS DISTINCT FROM OLD.auth_ref THEN
    NEW.provider_review_id := NULL;
    NEW.provider_contract_hash := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_clear_provider_review_on_connector_change() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER platform_connector_provider_review_invalidate
  BEFORE UPDATE ON public.platform_connector_definitions
  FOR EACH ROW EXECUTE FUNCTION public.platform_clear_provider_review_on_connector_change();

CREATE FUNCTION public.platform_register_provider_adapter_review(
  p_actor_id UUID,p_workspace_id UUID,p_connection_id TEXT,p_contract JSONB,p_expected_connector_revision INTEGER
)
RETURNS SETOF public.platform_provider_adapter_reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE connector public.platform_connector_definitions%ROWTYPE;
  review public.platform_provider_adapter_reviews%ROWTYPE; component JSONB;
  usage_keys TEXT[] := '{}'; maximum_charge NUMERIC := 0; rate NUMERIC; charge_units NUMERIC; max_units NUMERIC;
  digest TEXT; existing BOOLEAN := FALSE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  SELECT * INTO connector FROM public.platform_connector_definitions
    WHERE workspace_id=p_workspace_id AND connection_id=p_connection_id AND status='reviewed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reviewed connector not found' USING ERRCODE='P0002'; END IF;
  IF p_expected_connector_revision IS DISTINCT FROM connector.revision THEN
    RAISE EXCEPTION 'Connector revision conflict' USING ERRCODE='40001';
  END IF;

  IF p_contract IS NULL OR NOT public.platform_json_keys_allowed(p_contract,ARRAY[
      'schemaVersion','providerKey','adapterKey','adapterVersion','idempotencyMode','unknownOutcomeRecovery',
      'pricingVersion','currency','components','maxCostMicrosPerOperation','reviewedBy','reviewedAt'
    ]) OR p_contract->'schemaVersion' IS DISTINCT FROM '1'::JSONB OR p_contract->>'currency'<>'USD'
    OR p_contract->>'providerKey' !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_contract->>'adapterKey' !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_contract->>'adapterVersion' !~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    OR p_contract->>'idempotencyMode' NOT IN ('provider_key','lookup_by_operation_id','none')
    OR p_contract->>'unknownOutcomeRecovery' NOT IN ('provider_lookup','manual_review','unavailable')
    OR (p_contract->>'idempotencyMode'='none' AND p_contract->>'unknownOutcomeRecovery'='provider_lookup')
    OR p_contract->>'reviewedBy' IS DISTINCT FROM p_actor_id::TEXT
    OR p_contract->>'reviewedAt' !~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
    OR (p_contract->>'reviewedAt')::TIMESTAMPTZ IS NULL
    OR jsonb_typeof(p_contract->'pricingVersion') IS DISTINCT FROM 'number'
    OR (p_contract->>'pricingVersion')::NUMERIC NOT BETWEEN 1 AND 1000000
    OR trunc((p_contract->>'pricingVersion')::NUMERIC)<>(p_contract->>'pricingVersion')::NUMERIC
    OR jsonb_typeof(p_contract->'maxCostMicrosPerOperation') IS DISTINCT FROM 'number'
    OR (p_contract->>'maxCostMicrosPerOperation')::NUMERIC NOT BETWEEN 0 AND 1000000000000
    OR trunc((p_contract->>'maxCostMicrosPerOperation')::NUMERIC)<>(p_contract->>'maxCostMicrosPerOperation')::NUMERIC
    OR jsonb_typeof(p_contract->'components') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_contract->'components') NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'Invalid provider adapter review contract' USING ERRCODE='22023';
  END IF;

  FOR component IN SELECT value FROM jsonb_array_elements(p_contract->'components') LOOP
    IF NOT public.platform_json_keys_allowed(component,ARRAY['usageKey','rateMicros','chargeUnits','maxBillableUnits','required'])
      OR component->>'usageKey' NOT IN ('request_count','operation_count','input_tokens','output_tokens')
      OR component->>'usageKey'=ANY(usage_keys)
      OR jsonb_typeof(component->'rateMicros') IS DISTINCT FROM 'number'
      OR jsonb_typeof(component->'chargeUnits') IS DISTINCT FROM 'number'
      OR jsonb_typeof(component->'maxBillableUnits') IS DISTINCT FROM 'number'
      OR jsonb_typeof(component->'required') IS DISTINCT FROM 'boolean'
      OR (component->>'rateMicros')::NUMERIC NOT BETWEEN 0 AND 1000000000000
      OR trunc((component->>'rateMicros')::NUMERIC)<>(component->>'rateMicros')::NUMERIC
      OR (component->>'chargeUnits')::NUMERIC NOT BETWEEN 1 AND 1000000000
      OR trunc((component->>'chargeUnits')::NUMERIC)<>(component->>'chargeUnits')::NUMERIC
      OR (component->>'maxBillableUnits')::NUMERIC NOT BETWEEN 1 AND 1000000000000
      OR trunc((component->>'maxBillableUnits')::NUMERIC)<>(component->>'maxBillableUnits')::NUMERIC THEN
      RAISE EXCEPTION 'Invalid provider pricing component' USING ERRCODE='22023';
    END IF;
    usage_keys:=array_append(usage_keys,component->>'usageKey');
    rate:=(component->>'rateMicros')::NUMERIC;
    charge_units:=(component->>'chargeUnits')::NUMERIC;
    max_units:=(component->>'maxBillableUnits')::NUMERIC;
    maximum_charge:=maximum_charge+ceil(max_units*rate/charge_units);
  END LOOP;
  IF maximum_charge>(p_contract->>'maxCostMicrosPerOperation')::NUMERIC THEN
    RAISE EXCEPTION 'Provider operation ceiling is below maximum rated usage' USING ERRCODE='22023';
  END IF;

  digest:=encode(sha256(convert_to(p_contract::TEXT,'UTF8')),'hex');
  INSERT INTO public.platform_provider_adapter_reviews(
    workspace_id,connector_id,provider_key,adapter_key,adapter_version,contract,contract_hash,reviewed_by,reviewed_at
  ) VALUES(p_workspace_id,connector.id,p_contract->>'providerKey',p_contract->>'adapterKey',p_contract->>'adapterVersion',
    p_contract,digest,p_actor_id,(p_contract->>'reviewedAt')::TIMESTAMPTZ)
    ON CONFLICT (workspace_id,connector_id,adapter_key,adapter_version) DO NOTHING
    RETURNING * INTO review;
  IF NOT FOUND THEN
    SELECT * INTO review FROM public.platform_provider_adapter_reviews
      WHERE workspace_id=p_workspace_id AND connector_id=connector.id
        AND adapter_key=p_contract->>'adapterKey' AND adapter_version=p_contract->>'adapterVersion';
    IF review.contract_hash<>digest THEN
      RAISE EXCEPTION 'Provider adapter versions are immutable' USING ERRCODE='40001';
    END IF;
  ELSE
    existing:=TRUE;
  END IF;

  IF connector.provider_review_id IS DISTINCT FROM review.id OR connector.provider_contract_hash IS DISTINCT FROM review.contract_hash THEN
    UPDATE public.platform_connector_definitions SET provider_review_id=review.id,
      provider_contract_hash=review.contract_hash,revision=revision+1,reviewed_by=p_actor_id,updated_at=now()
      WHERE id=connector.id;
  END IF;
  IF existing THEN
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
      VALUES(p_workspace_id,p_actor_id,'user','connector.provider_adapter.reviewed','connector_provider_adapter',review.id::TEXT,
        jsonb_build_object('connectionId',p_connection_id,'providerKey',review.provider_key,
          'adapterKey',review.adapter_key,'adapterVersion',review.adapter_version,'contractHash',digest));
  END IF;
  RETURN NEXT review;
END;
$$;

CREATE FUNCTION public.platform_pin_provider_review_on_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE connector public.platform_connector_definitions%ROWTYPE; review public.platform_provider_adapter_reviews%ROWTYPE;
BEGIN
  SELECT * INTO connector FROM public.platform_connector_definitions
    WHERE workspace_id=NEW.workspace_id AND connection_id=NEW.connection_id AND status='reviewed' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reviewed connector not found for reservation' USING ERRCODE='55000'; END IF;
  IF connector.provider_review_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO review FROM public.platform_provider_adapter_reviews
    WHERE workspace_id=NEW.workspace_id AND id=connector.provider_review_id FOR SHARE;
  IF NOT FOUND OR review.contract_hash<>connector.provider_contract_hash THEN
    RAISE EXCEPTION 'Provider adapter review pin is stale' USING ERRCODE='55000';
  END IF;
  NEW.provider_review_id:=review.id;
  NEW.provider_contract_hash:=review.contract_hash;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_pin_provider_review_on_reservation() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER platform_reservation_pin_provider_review
  BEFORE INSERT ON public.platform_capability_reservations
  FOR EACH ROW EXECUTE FUNCTION public.platform_pin_provider_review_on_reservation();

REVOKE ALL ON FUNCTION public.platform_register_provider_adapter_review(UUID,UUID,TEXT,JSONB,INTEGER) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.platform_register_provider_adapter_review(UUID,UUID,TEXT,JSONB,INTEGER) TO service_role;

COMMENT ON TABLE public.platform_provider_adapter_reviews IS
  'Immutable owner/admin-reviewed provider adapter pricing and idempotency contracts. Reviews are metadata only and do not authorize dispatch.';
