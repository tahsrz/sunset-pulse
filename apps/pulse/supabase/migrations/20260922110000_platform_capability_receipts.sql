-- Capability admission metadata and immutable effect evidence.
-- This migration stores policy/receipt facts only; it does not dispatch tools.

CREATE FUNCTION public.platform_validate_capability_policy(p_policy JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path=public AS $$
DECLARE capability JSONB; identity TEXT; identities TEXT[] := '{}';
BEGIN
  IF p_policy IS NULL OR NOT public.platform_json_keys_allowed(p_policy, ARRAY['policyVersion','capabilities','allowedConnections','externalEffectsEnabled'])
    OR p_policy->'policyVersion' IS DISTINCT FROM '1'::JSONB
    OR jsonb_typeof(p_policy->'capabilities') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_policy->'capabilities') > 32
    OR jsonb_typeof(p_policy->'allowedConnections') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_policy->'allowedConnections') > 32
    OR p_policy->'externalEffectsEnabled' IS DISTINCT FROM 'false'::JSONB THEN
    RAISE EXCEPTION 'Invalid capability policy' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_policy->'allowedConnections') value
    WHERE value !~ '^[a-z][a-z0-9_.:-]{0,127}$') THEN
    RAISE EXCEPTION 'Invalid capability connection' USING ERRCODE='22023';
  END IF;
  FOR capability IN SELECT value FROM jsonb_array_elements(p_policy->'capabilities') LOOP
    IF NOT public.platform_json_keys_allowed(capability, ARRAY['connectionId','tool','operation','inputSchemaHash','outputSchemaHash','actionClass'])
      OR COALESCE(capability->>'connectionId','') !~ '^[a-z][a-z0-9_.:-]{0,127}$'
      OR COALESCE(capability->>'tool','') !~ '^[a-z][a-z0-9_.:-]{0,127}$'
      OR COALESCE(capability->>'operation','') !~ '^[a-z][a-z0-9_.:-]{0,127}$'
      OR COALESCE(capability->>'inputSchemaHash','') !~ '^[a-f0-9]{64}$'
      OR COALESCE(capability->>'outputSchemaHash','') !~ '^[a-f0-9]{64}$'
      OR capability->>'actionClass' NOT IN ('read','prepare') THEN
      RAISE EXCEPTION 'Invalid or unsafe capability declaration' USING ERRCODE='22023';
    END IF;
    IF NOT (p_policy->'allowedConnections' @> jsonb_build_array(capability->>'connectionId')) THEN
      RAISE EXCEPTION 'Capability connection is not allowlisted' USING ERRCODE='22023';
    END IF;
    identity := (capability->>'connectionId') || ':' || (capability->>'tool') || ':' || (capability->>'operation');
    IF identity = ANY(identities) THEN RAISE EXCEPTION 'Duplicate capability identity' USING ERRCODE='22023'; END IF;
    identities := array_append(identities, identity);
  END LOOP;
END;
$$;

CREATE TABLE public.platform_capability_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  app_install_id UUID NOT NULL REFERENCES public.platform_app_installs(id),
  policy JSONB NOT NULL,
  policy_hash TEXT NOT NULL CHECK (policy_hash ~ '^[a-f0-9]{64}$'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, app_install_id),
  CHECK (jsonb_typeof(policy)='object' AND octet_length(policy::TEXT)<=131072)
);
ALTER TABLE public.platform_capability_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_capability_policies_read ON public.platform_capability_policies FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_capability_policies FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_capability_policies TO authenticated, service_role;

CREATE FUNCTION public.platform_save_capability_policy(
  p_actor_id UUID, p_workspace_id UUID, p_app_install_id UUID, p_policy JSONB, p_expected_revision INTEGER
)
RETURNS SETOF public.platform_capability_policies LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_capability_policies%ROWTYPE; install public.platform_app_installs%ROWTYPE; digest TEXT;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id, p_workspace_id, ARRAY['owner','admin']);
  PERFORM public.platform_validate_capability_policy(p_policy);
  SELECT * INTO install FROM public.platform_app_installs WHERE id=p_app_install_id AND workspace_id=p_workspace_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'App install is outside workspace' USING ERRCODE='42501'; END IF;
  digest := encode(sha256(convert_to(p_policy::TEXT,'UTF8')),'hex');
  SELECT * INTO saved FROM public.platform_capability_policies WHERE workspace_id=p_workspace_id AND app_install_id=p_app_install_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Capability policy revision conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.platform_capability_policies(workspace_id,app_install_id,policy,policy_hash,created_by)
      VALUES(p_workspace_id,p_app_install_id,p_policy,digest,p_actor_id) RETURNING * INTO saved;
  ELSE
    IF p_expected_revision IS DISTINCT FROM saved.revision THEN RAISE EXCEPTION 'Capability policy revision conflict' USING ERRCODE='40001'; END IF;
    UPDATE public.platform_capability_policies SET policy=p_policy,policy_hash=digest,revision=revision+1,updated_at=now()
      WHERE id=saved.id RETURNING * INTO saved;
  END IF;
  RETURN NEXT saved;
END;
$$;

CREATE TABLE public.platform_effect_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  run_id UUID NOT NULL,
  checkpoint_id UUID REFERENCES public.platform_checkpoints(id),
  operation_id UUID NOT NULL,
  operation_hash TEXT NOT NULL CHECK (operation_hash ~ '^[a-f0-9]{64}$'),
  target_hash TEXT NOT NULL CHECK (target_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL CHECK (status IN ('prepared','submitted','accepted','unknown','failed','reconciled')),
  provider_receipt_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (workspace_id, operation_id),
  CHECK ((status IN ('accepted','failed','reconciled')) = (resolved_at IS NOT NULL)),
  CHECK (status <> 'accepted' OR provider_receipt_ref IS NOT NULL),
  CHECK (provider_receipt_ref IS NULL OR char_length(btrim(provider_receipt_ref)) BETWEEN 1 AND 240)
);
ALTER TABLE public.platform_effect_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_effect_receipts_read ON public.platform_effect_receipts FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_effect_receipts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_effect_receipts TO authenticated, service_role;

CREATE FUNCTION public.platform_record_effect_receipt(
  p_workspace_id UUID, p_run_id UUID, p_checkpoint_id UUID, p_operation_id UUID,
  p_operation_hash TEXT, p_target_hash TEXT, p_status TEXT, p_provider_receipt_ref TEXT,
  p_resolved_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.platform_effect_receipts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_effect_receipts%ROWTYPE;
BEGIN
  IF p_operation_hash !~ '^[a-f0-9]{64}$' OR p_target_hash !~ '^[a-f0-9]{64}$'
    OR p_status NOT IN ('prepared','submitted','accepted','unknown','failed','reconciled')
    OR (p_status IN ('accepted','failed','reconciled')) IS DISTINCT FROM (p_resolved_at IS NOT NULL)
    OR (p_status='accepted' AND p_provider_receipt_ref IS NULL) THEN
    RAISE EXCEPTION 'Invalid effect receipt' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id) THEN
    RAISE EXCEPTION 'Run is outside workspace' USING ERRCODE='42501';
  END IF;
  IF p_checkpoint_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.platform_checkpoints WHERE id=p_checkpoint_id AND run_id=p_run_id AND workspace_id=p_workspace_id
  ) THEN RAISE EXCEPTION 'Checkpoint is outside run' USING ERRCODE='42501'; END IF;
  INSERT INTO public.platform_effect_receipts(workspace_id,run_id,checkpoint_id,operation_id,operation_hash,target_hash,status,provider_receipt_ref,resolved_at)
    VALUES(p_workspace_id,p_run_id,p_checkpoint_id,p_operation_id,p_operation_hash,p_target_hash,p_status,p_provider_receipt_ref,p_resolved_at)
    ON CONFLICT (workspace_id,operation_id) DO NOTHING
    RETURNING * INTO saved;
  IF NOT FOUND THEN SELECT * INTO saved FROM public.platform_effect_receipts WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id; END IF;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_validate_capability_policy(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_validate_capability_policy(JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.platform_save_capability_policy(UUID,UUID,UUID,JSONB,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_save_capability_policy(UUID,UUID,UUID,JSONB,INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.platform_record_effect_receipt(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_effect_receipt(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO service_role;
