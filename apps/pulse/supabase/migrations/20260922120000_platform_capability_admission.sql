-- Transactional capability admission. No provider or external effect is invoked.

CREATE TABLE public.platform_quota_limits (
  workspace_id UUID PRIMARY KEY REFERENCES public.platform_workspaces(id),
  max_concurrent_operations INTEGER NOT NULL CHECK (max_concurrent_operations BETWEEN 1 AND 1000),
  max_steps_per_run INTEGER NOT NULL CHECK (max_steps_per_run BETWEEN 1 AND 10000),
  max_estimated_cost_usd NUMERIC(12,6) NOT NULL CHECK (max_estimated_cost_usd >= 0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_quota_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_quota_limits_read ON public.platform_quota_limits FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_quota_limits FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_quota_limits TO authenticated, service_role;

CREATE FUNCTION public.platform_save_quota_limit(
  p_actor_id UUID, p_workspace_id UUID, p_max_concurrent_operations INTEGER,
  p_max_steps_per_run INTEGER, p_max_estimated_cost_usd NUMERIC, p_expected_revision INTEGER
)
RETURNS SETOF public.platform_quota_limits LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_quota_limits%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_max_concurrent_operations NOT BETWEEN 1 AND 1000 OR p_max_steps_per_run NOT BETWEEN 1 AND 10000
    OR p_max_estimated_cost_usd IS NULL OR p_max_estimated_cost_usd < 0 THEN
    RAISE EXCEPTION 'Invalid quota limit' USING ERRCODE='22023';
  END IF;
  SELECT * INTO saved FROM public.platform_quota_limits WHERE workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Quota revision conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.platform_quota_limits(workspace_id,max_concurrent_operations,max_steps_per_run,max_estimated_cost_usd,updated_by)
      VALUES(p_workspace_id,p_max_concurrent_operations,p_max_steps_per_run,p_max_estimated_cost_usd,p_actor_id)
      RETURNING * INTO saved;
  ELSE
    IF p_expected_revision IS DISTINCT FROM saved.revision THEN RAISE EXCEPTION 'Quota revision conflict' USING ERRCODE='40001'; END IF;
    UPDATE public.platform_quota_limits SET max_concurrent_operations=p_max_concurrent_operations,
      max_steps_per_run=p_max_steps_per_run,max_estimated_cost_usd=p_max_estimated_cost_usd,
      revision=revision+1,updated_by=p_actor_id,updated_at=now()
      WHERE workspace_id=p_workspace_id RETURNING * INTO saved;
  END IF;
  RETURN NEXT saved;
END;
$$;

CREATE TABLE public.platform_capability_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  run_id UUID NOT NULL,
  operation_id UUID NOT NULL,
  connection_id TEXT NOT NULL CHECK (connection_id ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  tool TEXT NOT NULL CHECK (tool ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  operation TEXT NOT NULL CHECK (operation ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  input_schema_hash TEXT NOT NULL CHECK (input_schema_hash ~ '^[a-f0-9]{64}$'),
  output_schema_hash TEXT NOT NULL CHECK (output_schema_hash ~ '^[a-f0-9]{64}$'),
  step_units INTEGER NOT NULL CHECK (step_units BETWEEN 1 AND 10000),
  estimated_cost_usd NUMERIC(12,6) NOT NULL CHECK (estimated_cost_usd >= 0),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','released','consumed','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  UNIQUE(workspace_id,operation_id)
);
ALTER TABLE public.platform_capability_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_capability_reservations_read ON public.platform_capability_reservations FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_capability_reservations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_capability_reservations TO authenticated, service_role;
CREATE INDEX platform_capability_reservations_active_idx ON public.platform_capability_reservations(workspace_id,status,created_at);

CREATE FUNCTION public.platform_admit_capability_operation(
  p_workspace_id UUID, p_app_install_id UUID, p_run_id UUID, p_operation_id UUID,
  p_connection_id TEXT, p_tool TEXT, p_operation TEXT, p_input_schema_hash TEXT,
  p_output_schema_hash TEXT, p_step_units INTEGER, p_estimated_cost_usd NUMERIC
)
RETURNS SETOF public.platform_capability_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_capability_reservations%ROWTYPE; policy JSONB; quota public.platform_quota_limits%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL OR p_step_units NOT BETWEEN 1 AND 10000 OR p_estimated_cost_usd IS NULL OR p_estimated_cost_usd < 0
    OR p_connection_id !~ '^[a-z][a-z0-9_.:-]{0,127}$' OR p_tool !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_operation !~ '^[a-z][a-z0-9_.:-]{0,127}$' OR p_input_schema_hash !~ '^[a-f0-9]{64}$'
    OR p_output_schema_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid capability admission request' USING ERRCODE='22023';
  END IF;
  SELECT * INTO saved FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF saved.connection_id<>p_connection_id OR saved.tool<>p_tool OR saved.operation<>p_operation
      OR saved.input_schema_hash<>p_input_schema_hash OR saved.output_schema_hash<>p_output_schema_hash
      OR saved.step_units<>p_step_units OR saved.estimated_cost_usd<>p_estimated_cost_usd THEN
      RAISE EXCEPTION 'Capability operation identity conflict' USING ERRCODE='40001';
    END IF;
    RETURN NEXT saved; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id) THEN
    RAISE EXCEPTION 'Run is outside workspace' USING ERRCODE='42501';
  END IF;
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
  IF (SELECT count(*) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND status='reserved') >= quota.max_concurrent_operations
    OR (SELECT COALESCE(sum(step_units),0) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND run_id=p_run_id AND status='reserved') + p_step_units > quota.max_steps_per_run
    OR (SELECT COALESCE(sum(estimated_cost_usd),0) FROM public.platform_capability_reservations WHERE workspace_id=p_workspace_id AND status='reserved') + p_estimated_cost_usd > quota.max_estimated_cost_usd THEN
    RAISE EXCEPTION 'Capability quota exceeded' USING ERRCODE='55P03';
  END IF;
  INSERT INTO public.platform_capability_reservations(workspace_id,run_id,operation_id,connection_id,tool,operation,input_schema_hash,output_schema_hash,step_units,estimated_cost_usd)
    VALUES(p_workspace_id,p_run_id,p_operation_id,p_connection_id,p_tool,p_operation,p_input_schema_hash,p_output_schema_hash,p_step_units,p_estimated_cost_usd)
    RETURNING * INTO saved;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_save_quota_limit(UUID,UUID,INTEGER,INTEGER,NUMERIC,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_save_quota_limit(UUID,UUID,INTEGER,INTEGER,NUMERIC,INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.platform_admit_capability_operation(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,NUMERIC) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_admit_capability_operation(UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER,NUMERIC) TO service_role;
