-- W3 app admission: pin the install and validated launch inputs on the
-- existing platform_runs row. This does not create another queue or enable
-- the platform_run event contract.
ALTER TABLE public.platform_runs
  ADD COLUMN IF NOT EXISTS app_install_id UUID REFERENCES public.platform_app_installs(id),
  ADD COLUMN IF NOT EXISTS app_manifest_hash TEXT,
  ADD COLUMN IF NOT EXISTS app_workflow_key TEXT,
  ADD COLUMN IF NOT EXISTS app_install_revision INTEGER,
  ADD COLUMN IF NOT EXISTS app_inputs JSONB,
  ADD COLUMN IF NOT EXISTS app_resource_refs JSONB;

ALTER TABLE public.platform_runs
  ADD CONSTRAINT platform_runs_app_snapshot_shape_check CHECK (
    (app_install_id IS NULL AND app_manifest_hash IS NULL AND app_workflow_key IS NULL
      AND app_install_revision IS NULL AND app_inputs IS NULL AND app_resource_refs IS NULL)
    OR (app_install_id IS NOT NULL AND app_manifest_hash ~ '^[a-f0-9]{64}$'
      AND app_workflow_key ~ '^[a-z][a-z0-9_-]{0,63}$' AND app_install_revision > 0
      AND jsonb_typeof(app_inputs) = 'object' AND octet_length(app_inputs::TEXT) <= 65536
      AND jsonb_typeof(app_resource_refs) = 'array' AND jsonb_array_length(app_resource_refs) <= 16
      AND octet_length(app_resource_refs::TEXT) <= 65536)
  );

CREATE INDEX IF NOT EXISTS platform_runs_app_install_idx
  ON public.platform_runs(app_install_id, created_at DESC, id);

CREATE FUNCTION public.platform_start_app_run(
  p_actor_id UUID, p_workspace_id UUID, p_install_id UUID, p_install_revision INTEGER,
  p_workflow_key TEXT, p_request_key UUID, p_inputs JSONB, p_resource_refs JSONB
)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  install public.platform_app_installs%ROWTYPE;
  saved public.platform_runs%ROWTYPE;
  workflow JSONB;
  ref JSONB;
  link RECORD;
  v_expected_revision INTEGER;
  v_resource_type TEXT;
  v_resource_id TEXT;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id, p_workspace_id, ARRAY['owner','admin','member']);
  IF p_install_id IS NULL OR p_install_revision IS NULL OR p_install_revision <= 0
    OR p_request_key IS NULL OR p_workflow_key IS NULL OR p_workflow_key !~ '^[a-z][a-z0-9_-]{0,63}$'
    OR jsonb_typeof(p_inputs) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_resource_refs) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_resource_refs) > 16 THEN
    RAISE EXCEPTION 'Invalid app launch input' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO install FROM public.platform_app_installs
  WHERE id = p_install_id AND workspace_id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'App install not found' USING ERRCODE = 'P0002'; END IF;
  IF install.status <> 'installed' THEN RAISE EXCEPTION 'App install is disabled' USING ERRCODE = '42501'; END IF;
  IF install.revision <> p_install_revision THEN RAISE EXCEPTION 'App install revision conflict' USING ERRCODE = '40001'; END IF;

  PERFORM public.platform_validate_manifest_values(install.manifest->'inputSchema', p_inputs);
  SELECT value INTO workflow FROM jsonb_array_elements(install.manifest->'workflows') value
  WHERE value->>'key' = p_workflow_key;
  IF workflow IS NULL THEN RAISE EXCEPTION 'Workflow is not installed' USING ERRCODE = '22023'; END IF;
  PERFORM public.platform_validate_run_definition(workflow);

  FOR ref IN SELECT value FROM jsonb_array_elements(p_resource_refs) LOOP
    IF jsonb_typeof(ref) IS DISTINCT FROM 'object'
      OR NOT public.platform_json_keys_allowed(ref, ARRAY['resourceType','resourceId','expectedRevision'])
      OR COALESCE(ref->>'resourceType','') NOT IN ('property_shortlist','assignment','sprint','vibe_revision')
      OR COALESCE(char_length(ref->>'resourceId'),0) NOT BETWEEN 1 AND 240
      OR COALESCE(ref->>'expectedRevision','') !~ '^[1-9][0-9]{0,8}$' THEN
      RAISE EXCEPTION 'Invalid app resource reference' USING ERRCODE = '22023';
    END IF;
    v_resource_type := ref->>'resourceType'; v_resource_id := ref->>'resourceId';
    v_expected_revision := (ref->>'expectedRevision')::INTEGER;
    SELECT * INTO link FROM public.platform_scope_links AS sl
    WHERE sl.workspace_id = p_workspace_id AND sl.resource_type = v_resource_type AND sl.resource_id = v_resource_id
      AND sl.status = 'mapped' FOR SHARE;
    IF NOT FOUND OR link.owner_id IS NULL OR link.source_revision IS DISTINCT FROM v_expected_revision THEN
      RAISE EXCEPTION 'App resource mapping is stale or unavailable' USING ERRCODE = '40001';
    END IF;
  END LOOP;

  INSERT INTO public.platform_runs(
    workspace_id, requested_by, request_key, definition, definition_hash, state, status,
    app_install_id, app_manifest_hash, app_workflow_key, app_install_revision, app_inputs, app_resource_refs
  ) VALUES (
    p_workspace_id, p_actor_id, p_request_key, workflow,
    encode(sha256(convert_to(workflow::TEXT,'UTF8')),'hex'),
    jsonb_build_object('node', workflow->>'entry', 'generation', 1, 'answers', '{}'::JSONB), 'ready',
    install.id, install.manifest_hash, p_workflow_key, install.revision, p_inputs, p_resource_refs
  ) ON CONFLICT (workspace_id, requested_by, request_key) DO NOTHING RETURNING * INTO saved;

  IF NOT FOUND THEN
    SELECT * INTO saved FROM public.platform_runs
    WHERE workspace_id = p_workspace_id AND requested_by = p_actor_id AND request_key = p_request_key;
    IF saved.app_install_id IS DISTINCT FROM install.id OR saved.app_install_revision IS DISTINCT FROM install.revision
      OR saved.app_workflow_key IS DISTINCT FROM p_workflow_key OR saved.app_inputs IS DISTINCT FROM p_inputs
      OR saved.app_resource_refs IS DISTINCT FROM p_resource_refs OR saved.definition IS DISTINCT FROM workflow THEN
      RAISE EXCEPTION 'Request key content conflict' USING ERRCODE = '40001';
    END IF;
    RETURN NEXT saved; RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workflow_event_contracts WHERE workflow_key = 'platform_run' AND enabled) THEN
    RAISE EXCEPTION 'Platform worker admission is disabled' USING ERRCODE = '55000';
  END IF;
  PERFORM public.enqueue_workflow_event(p_actor_id, 'platform_run', 'run:' || saved.id || ':1',
    jsonb_build_object('runId', saved.id, 'workspaceId', p_workspace_id, 'generation', 1), 1, NULL);
  INSERT INTO public.platform_audit_events(workspace_id, actor_id, actor_kind, action, resource_type, resource_id, safe_metadata)
    VALUES (p_workspace_id, p_actor_id, 'user', 'run.app_started', 'platform_run', saved.id::TEXT,
      jsonb_build_object('installId', install.id, 'manifestHash', install.manifest_hash,
        'workflowKey', p_workflow_key, 'installRevision', install.revision));
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_start_app_run(UUID,UUID,UUID,INTEGER,TEXT,UUID,JSONB,JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_start_app_run(UUID,UUID,UUID,INTEGER,TEXT,UUID,JSONB,JSONB)
  TO service_role;
