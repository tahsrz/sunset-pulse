-- Core Platform v2: JSON execution state + one human checkpoint table.
-- workflow_jobs remains the only queue. Admission stays disabled until workers
-- containing platform_run are deployed; fixtures explicitly enable the contract.
CREATE TABLE public.platform_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  request_key UUID NOT NULL,
  definition JSONB NOT NULL CHECK (jsonb_typeof(definition) = 'object' AND octet_length(definition::TEXT) <= 131072),
  definition_hash TEXT NOT NULL,
  state JSONB NOT NULL CHECK (jsonb_typeof(state) = 'object' AND octet_length(state::TEXT) <= 1048576),
  status TEXT NOT NULL CHECK (status IN ('ready','waiting','completed','cancelled','blocked')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, requested_by, request_key), UNIQUE (workspace_id, id)
);
CREATE INDEX platform_runs_workspace_time_idx ON public.platform_runs(workspace_id, created_at DESC, id);

CREATE TABLE public.platform_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL, run_id UUID NOT NULL, node_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('question','approval','effect_gate')),
  prompt TEXT NOT NULL CHECK (char_length(prompt) BETWEEN 1 AND 2000),
  response_schema JSONB, target JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','cancelled')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  response JSONB, submission_key UUID, resolved_by UUID REFERENCES auth.users(id), resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, run_id) REFERENCES public.platform_runs(workspace_id, id),
  UNIQUE (run_id, node_id),
  CHECK ((type = 'question' AND response_schema IS NOT NULL) OR (type <> 'question' AND target IS NOT NULL)),
  CHECK (status <> 'resolved' OR (response IS NOT NULL AND submission_key IS NOT NULL AND resolved_by IS NOT NULL))
);
CREATE INDEX platform_checkpoints_inbox_idx ON public.platform_checkpoints(workspace_id, status, created_at, id);
ALTER TABLE public.platform_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_checkpoints ENABLE ROW LEVEL SECURITY;
-- Identity tables are read through services; authenticated roles do not need
-- direct table privileges merely to evaluate this scoped read predicate.
CREATE FUNCTION public.platform_can_read_runs(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_workspaces w
    JOIN public.platform_memberships m ON m.workspace_id = w.id
    WHERE w.id = p_workspace_id AND w.status = 'active'
      AND m.user_id = auth.uid() AND m.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.platform_can_read_runs(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.platform_can_read_runs(UUID) TO authenticated, service_role;
CREATE POLICY platform_runs_member_read ON public.platform_runs FOR SELECT TO authenticated USING (
  public.platform_can_read_runs(workspace_id)
);
CREATE POLICY platform_checkpoints_member_read ON public.platform_checkpoints FOR SELECT TO authenticated USING (
  public.platform_can_read_runs(workspace_id)
);
REVOKE ALL ON public.platform_runs, public.platform_checkpoints FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_runs, public.platform_checkpoints TO authenticated, service_role;

INSERT INTO public.workflow_event_contracts(workflow_key, min_payload_version, max_payload_version, enabled)
VALUES ('platform_run', 1, 1, false) ON CONFLICT (workflow_key) DO NOTHING;

-- Shared row locks serialize membership revocation/workspace archive with any
-- accepted transition. Lock order: job (worker only), workspace, member, run, checkpoint.
CREATE FUNCTION public.platform_require_run_role(p_actor_id UUID, p_workspace_id UUID, p_roles TEXT[])
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE member_role TEXT;
BEGIN
  PERFORM 1 FROM public.platform_workspaces WHERE id = p_workspace_id AND status = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace access denied' USING ERRCODE = '42501'; END IF;
  SELECT role INTO member_role FROM public.platform_memberships
  WHERE workspace_id = p_workspace_id AND user_id = p_actor_id AND status = 'active' FOR SHARE;
  IF member_role IS NULL OR NOT (member_role = ANY(p_roles)) THEN
    RAISE EXCEPTION 'Workspace action denied' USING ERRCODE = '42501';
  END IF;
  RETURN member_role;
END;
$$;

CREATE FUNCTION public.platform_validate_run_definition(p_definition JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE node JSONB; current_id TEXT; visited TEXT[] := '{}'; node_count INTEGER;
BEGIN
  IF p_definition IS NULL OR jsonb_typeof(p_definition) <> 'object'
    OR p_definition->>'schemaVersion' IS DISTINCT FROM '1'
    OR COALESCE(p_definition->>'key','') !~ '^[a-z][a-z0-9_-]{0,63}$'
    OR COALESCE(p_definition->>'version','') !~ '^[1-9][0-9]{0,8}$'
    OR jsonb_typeof(p_definition->'nodes') IS DISTINCT FROM 'array'
    OR octet_length(p_definition::TEXT) > 131072 THEN
    RAISE EXCEPTION 'Invalid run definition' USING ERRCODE = '22023';
  END IF;
  node_count := jsonb_array_length(p_definition->'nodes');
  IF node_count NOT BETWEEN 1 AND 64 OR node_count <> (
    SELECT count(DISTINCT n->>'id') FROM jsonb_array_elements(p_definition->'nodes') n
  ) THEN RAISE EXCEPTION 'Invalid node count or duplicate node IDs' USING ERRCODE = '22023'; END IF;
  FOR node IN SELECT * FROM jsonb_array_elements(p_definition->'nodes') LOOP
    IF COALESCE(node->>'id','') !~ '^[a-z][a-z0-9_-]{0,63}$'
      OR COALESCE(node->>'kind','') NOT IN ('checkpoint','complete') THEN
      RAISE EXCEPTION 'Unsupported node' USING ERRCODE = '22023';
    END IF;
    IF node->>'kind' = 'checkpoint' THEN
      IF COALESCE(node->>'type','') NOT IN ('question','approval','effect_gate')
        OR COALESCE(char_length(btrim(node->>'prompt')),0) NOT BETWEEN 1 AND 2000
        OR COALESCE(node->>'next','') !~ '^[a-z][a-z0-9_-]{0,63}$' THEN
        RAISE EXCEPTION 'Invalid checkpoint' USING ERRCODE = '22023';
      END IF;
      IF node->>'type' = 'question' THEN
        IF COALESCE(node#>>'{responseSchema,type}','') NOT IN ('string','number','boolean') THEN
          RAISE EXCEPTION 'Unsupported response schema' USING ERRCODE = '22023';
        END IF;
        IF node->'responseSchema' ? 'enum' AND (
          node#>>'{responseSchema,type}' <> 'string'
          OR jsonb_typeof(node#>'{responseSchema,enum}') IS DISTINCT FROM 'array'
        ) THEN RAISE EXCEPTION 'Invalid response choices' USING ERRCODE = '22023'; END IF;
      ELSE
        IF jsonb_typeof(node->'target') IS DISTINCT FROM 'object'
          OR COALESCE(node#>>'{target,contentHash}','') !~ '^[a-f0-9]{64}$'
          OR COALESCE(node#>>'{target,revision}','') !~ '^[1-9][0-9]{0,8}$'
          OR COALESCE(char_length(node#>>'{target,resourceId}'),0) NOT BETWEEN 1 AND 240
          OR COALESCE(char_length(node#>>'{target,resourceType}'),0) NOT BETWEEN 1 AND 120
          OR COALESCE(char_length(node#>>'{target,action}'),0) NOT BETWEEN 1 AND 120 THEN
          RAISE EXCEPTION 'An exact review target is required' USING ERRCODE = '22023';
        END IF;
      END IF;
    END IF;
  END LOOP;
  current_id := p_definition->>'entry';
  LOOP
    SELECT n INTO node FROM jsonb_array_elements(p_definition->'nodes') n WHERE n->>'id' = current_id;
    IF NOT FOUND OR current_id = ANY(visited) THEN
      RAISE EXCEPTION 'Missing node or workflow cycle' USING ERRCODE = '22023';
    END IF;
    visited := array_append(visited, current_id);
    EXIT WHEN node->>'kind' = 'complete';
    current_id := node->>'next';
  END LOOP;
  IF cardinality(visited) <> node_count THEN RAISE EXCEPTION 'Unreachable nodes' USING ERRCODE = '22023'; END IF;
END;
$$;

CREATE FUNCTION public.platform_start_run(p_actor_id UUID, p_workspace_id UUID, p_request_key UUID, p_definition JSONB)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.platform_runs%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id, p_workspace_id, ARRAY['owner','admin','member']);
  PERFORM public.platform_validate_run_definition(p_definition);
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Request key required' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.platform_runs(workspace_id, requested_by, request_key, definition, definition_hash, state, status)
  VALUES (p_workspace_id, p_actor_id, p_request_key, p_definition,
    encode(sha256(convert_to(p_definition::TEXT,'UTF8')),'hex'),
    jsonb_build_object('node', p_definition->>'entry', 'generation', 1, 'answers', '{}'::JSONB), 'ready')
  ON CONFLICT (workspace_id, requested_by, request_key) DO NOTHING RETURNING * INTO saved;
  IF NOT FOUND THEN
    SELECT * INTO saved FROM public.platform_runs
    WHERE workspace_id = p_workspace_id AND requested_by = p_actor_id AND request_key = p_request_key;
    IF saved.definition IS DISTINCT FROM p_definition THEN
      RAISE EXCEPTION 'Request key content conflict' USING ERRCODE = '40001';
    END IF;
    RETURN NEXT saved; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workflow_event_contracts WHERE workflow_key = 'platform_run' AND enabled) THEN
    RAISE EXCEPTION 'Platform worker admission is disabled' USING ERRCODE = '55000';
  END IF;
  PERFORM public.enqueue_workflow_event(p_actor_id, 'platform_run', 'run:' || saved.id || ':1',
    jsonb_build_object('runId',saved.id,'workspaceId',p_workspace_id,'generation',1), 1, NULL);
  INSERT INTO public.platform_audit_events(workspace_id, actor_id, actor_kind, action, resource_type, resource_id)
  VALUES (p_workspace_id,p_actor_id,'user','run.started','platform_run',saved.id::TEXT);
  RETURN NEXT saved;
END;
$$;

CREATE FUNCTION public.platform_tick_run(p_job_id UUID, p_lease_token UUID)
RETURNS TABLE(run_id UUID, run_status TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job public.workflow_jobs%ROWTYPE; saved public.platform_runs%ROWTYPE; node JSONB; authorized BOOLEAN := true;
BEGIN
  SELECT * INTO job FROM public.workflow_jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND OR p_lease_token IS NULL OR job.workflow_key <> 'platform_run' OR job.trigger_kind <> 'event' OR job.payload_version <> 1
    OR job.status <> 'running' OR job.lease_token IS DISTINCT FROM p_lease_token
    OR job.lease_until IS NULL OR job.lease_until <= clock_timestamp() THEN
    RAISE EXCEPTION 'Invalid platform job lease' USING ERRCODE = '40001';
  END IF;
  BEGIN
    PERFORM public.platform_require_run_role(job.user_id, (job.payload->>'workspaceId')::UUID, ARRAY['owner','admin','member']);
  EXCEPTION WHEN insufficient_privilege THEN authorized := false;
  END;
  SELECT * INTO saved FROM public.platform_runs
  WHERE id = (job.payload->>'runId')::UUID AND workspace_id = (job.payload->>'workspaceId')::UUID
    AND requested_by = job.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE = 'P0002'; END IF;
  IF job.event_key IS DISTINCT FROM 'run:' || saved.id || ':' || (job.payload->>'generation') THEN
    RAISE EXCEPTION 'Invalid platform event identity' USING ERRCODE = '22023';
  END IF;
  IF saved.status = 'ready' AND saved.state->'generation' = job.payload->'generation' THEN
    IF NOT authorized THEN
      UPDATE public.platform_runs SET status = 'blocked', revision = revision + 1, updated_at = now()
      WHERE id = saved.id RETURNING * INTO saved;
    ELSE
      SELECT n INTO node FROM jsonb_array_elements(saved.definition->'nodes') n WHERE n->>'id' = saved.state->>'node';
      IF node->>'kind' = 'checkpoint' THEN
        INSERT INTO public.platform_checkpoints(workspace_id,run_id,node_id,type,prompt,response_schema,target)
        VALUES(saved.workspace_id,saved.id,node->>'id',node->>'type',node->>'prompt',node->'responseSchema',node->'target');
        UPDATE public.platform_runs SET status = 'waiting', revision = revision + 1, updated_at = now()
        WHERE id = saved.id RETURNING * INTO saved;
      ELSIF node->>'kind' = 'complete' THEN
        UPDATE public.platform_runs SET status = 'completed', revision = revision + 1, updated_at = now()
        WHERE id = saved.id RETURNING * INTO saved;
      ELSE RAISE EXCEPTION 'Unsupported run node' USING ERRCODE = '22023';
      END IF;
    END IF;
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(saved.workspace_id,job.user_id,'service','run.transition','platform_run',saved.id::TEXT,
      jsonb_build_object('status',saved.status,'revision',saved.revision,'jobId',job.id));
  END IF;
  -- Recheck wall time after lock waits. False rolls back every change above.
  IF NOT public.complete_workflow_job_with_result(job.id,p_lease_token,'platform_run',saved.id,NULL) THEN
    RAISE EXCEPTION 'Platform lease expired before commit' USING ERRCODE = '40001';
  END IF;
  RETURN QUERY SELECT saved.id,saved.status;
END;
$$;

CREATE FUNCTION public.platform_respond_checkpoint(
  p_actor_id UUID, p_workspace_id UUID, p_checkpoint_id UUID,
  p_expected_revision INTEGER, p_submission_key UUID, p_value JSONB
)
RETURNS SETOF public.platform_checkpoints LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cp public.platform_checkpoints%ROWTYPE; saved public.platform_runs%ROWTYPE; member_role TEXT; node JSONB; generation INTEGER;
BEGIN
  member_role := public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member','reviewer']);
  SELECT * INTO cp FROM public.platform_checkpoints WHERE id = p_checkpoint_id AND workspace_id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkpoint not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO saved FROM public.platform_runs WHERE id = cp.run_id AND workspace_id = p_workspace_id FOR UPDATE;
  SELECT * INTO cp FROM public.platform_checkpoints WHERE id = p_checkpoint_id FOR UPDATE;
  IF (cp.type = 'approval' AND member_role NOT IN ('owner','admin','reviewer'))
    OR (cp.type = 'effect_gate' AND member_role NOT IN ('owner','admin')) THEN
    RAISE EXCEPTION 'Checkpoint action denied' USING ERRCODE = '42501';
  END IF;
  IF p_expected_revision IS NULL OR p_submission_key IS NULL OR p_value IS NULL
    OR jsonb_typeof(p_value) NOT IN ('string','number','boolean') OR octet_length(p_value::TEXT) > 16384 THEN
    RAISE EXCEPTION 'Invalid checkpoint response' USING ERRCODE = '22023';
  END IF;
  IF cp.status = 'resolved' THEN
    IF cp.submission_key = p_submission_key AND cp.resolved_by = p_actor_id
      AND cp.response = p_value AND cp.revision = p_expected_revision + 1 THEN
      RETURN NEXT cp; RETURN;
    END IF;
    RAISE EXCEPTION 'Checkpoint response conflict' USING ERRCODE = '40001';
  END IF;
  IF cp.status <> 'pending' OR cp.revision <> p_expected_revision OR saved.status <> 'waiting'
    OR saved.state->>'node' <> cp.node_id THEN
    RAISE EXCEPTION 'Checkpoint revision conflict' USING ERRCODE = '40001';
  END IF;
  IF cp.type = 'question' THEN
    IF jsonb_typeof(p_value) IS DISTINCT FROM cp.response_schema->>'type'
      OR (jsonb_typeof(p_value) = 'string' AND char_length(p_value #>> '{}') NOT BETWEEN 1 AND 4000)
      OR (cp.response_schema ? 'enum' AND NOT ((cp.response_schema->'enum') @> jsonb_build_array(p_value))) THEN
      RAISE EXCEPTION 'Answer does not match response schema' USING ERRCODE = '22023';
    END IF;
  ELSIF jsonb_typeof(p_value) <> 'boolean' THEN
    RAISE EXCEPTION 'Decision must be boolean' USING ERRCODE = '22023';
  END IF;
  SELECT n INTO node FROM jsonb_array_elements(saved.definition->'nodes') n WHERE n->>'id' = cp.node_id;
  generation := (saved.state->>'generation')::INTEGER + 1;
  UPDATE public.platform_checkpoints SET status = 'resolved', response = p_value, submission_key = p_submission_key,
    resolved_by = p_actor_id, resolved_at = now(), revision = revision + 1
  WHERE id = cp.id RETURNING * INTO cp;
  UPDATE public.platform_runs SET state = jsonb_build_object('node',node->>'next','generation',generation,
    'answers',(state->'answers') || jsonb_build_object(cp.node_id,p_value)),
    status = CASE WHEN cp.type <> 'question' AND p_value = 'false'::JSONB THEN 'cancelled' ELSE 'ready' END,
    revision = revision + 1, updated_at = now()
  WHERE id = saved.id RETURNING * INTO saved;
  IF saved.status = 'ready' THEN
    IF NOT EXISTS (SELECT 1 FROM public.workflow_event_contracts WHERE workflow_key = 'platform_run' AND enabled) THEN
      RAISE EXCEPTION 'Platform worker admission is disabled' USING ERRCODE = '55000';
    END IF;
    PERFORM public.enqueue_workflow_event(saved.requested_by,'platform_run','run:' || saved.id || ':' || generation,
      jsonb_build_object('runId',saved.id,'workspaceId',saved.workspace_id,'generation',generation),1,NULL);
  END IF;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
  VALUES(p_workspace_id,p_actor_id,'user','checkpoint.resolved','platform_checkpoint',cp.id::TEXT,
    jsonb_build_object('runId',saved.id,'type',cp.type,'revision',cp.revision));
  RETURN NEXT cp;
END;
$$;

CREATE FUNCTION public.platform_cancel_run(p_actor_id UUID,p_workspace_id UUID,p_run_id UUID,p_expected_revision INTEGER)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.platform_runs%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
  SELECT * INTO saved FROM public.platform_runs WHERE id = p_run_id AND workspace_id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE = 'P0002'; END IF;
  IF p_expected_revision IS DISTINCT FROM saved.revision OR saved.status NOT IN ('ready','waiting','blocked') THEN
    RAISE EXCEPTION 'Run revision conflict' USING ERRCODE = '40001';
  END IF;
  UPDATE public.platform_runs SET status = 'cancelled', revision = revision + 1, updated_at = now()
  WHERE id = saved.id RETURNING * INTO saved;
  UPDATE public.platform_checkpoints SET status = 'cancelled', revision = revision + 1 WHERE run_id = saved.id AND status = 'pending';
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id)
  VALUES(p_workspace_id,p_actor_id,'user','run.cancelled','platform_run',saved.id::TEXT);
  -- Pending ticks observe cancelled state and complete a no-op receipt.
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_require_run_role(UUID,UUID,TEXT[]), public.platform_validate_run_definition(JSONB),
  public.platform_start_run(UUID,UUID,UUID,JSONB), public.platform_tick_run(UUID,UUID),
  public.platform_respond_checkpoint(UUID,UUID,UUID,INTEGER,UUID,JSONB), public.platform_cancel_run(UUID,UUID,UUID,INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_require_run_role(UUID,UUID,TEXT[]), public.platform_validate_run_definition(JSONB),
  public.platform_start_run(UUID,UUID,UUID,JSONB), public.platform_tick_run(UUID,UUID),
  public.platform_respond_checkpoint(UUID,UUID,UUID,INTEGER,UUID,JSONB), public.platform_cancel_run(UUID,UUID,UUID,INTEGER)
  TO service_role;
