-- Declarative condition nodes. This migration adds bounded branching only;
-- capability nodes and provider execution remain unsupported.

CREATE FUNCTION public.platform_validate_condition(p_condition JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE op TEXT; item JSONB;
BEGIN
  IF p_condition IS NULL OR jsonb_typeof(p_condition) <> 'object'
    OR NOT public.platform_json_keys_allowed(p_condition, ARRAY['op','path','value','conditions']) THEN
    RAISE EXCEPTION 'Invalid condition' USING ERRCODE = '22023';
  END IF;
  op := p_condition->>'op';
  IF op IN ('exists','equals') THEN
    IF NOT public.platform_json_keys_allowed(p_condition, CASE WHEN op='exists' THEN ARRAY['op','path'] ELSE ARRAY['op','path','value'] END)
      OR COALESCE(p_condition->>'path','') !~ '^answers(\.[a-z][a-z0-9_-]{0,63}){0,7}$' THEN
      RAISE EXCEPTION 'Invalid condition path' USING ERRCODE = '22023';
    END IF;
    IF op='equals' AND jsonb_typeof(p_condition->'value') NOT IN ('string','number','boolean','null') THEN
      RAISE EXCEPTION 'Condition values must be scalar' USING ERRCODE = '22023';
    END IF;
  ELSIF op IN ('all','any') THEN
    IF NOT public.platform_json_keys_allowed(p_condition, ARRAY['op','conditions'])
      OR jsonb_typeof(p_condition->'conditions') <> 'array'
      OR jsonb_array_length(p_condition->'conditions') NOT BETWEEN 1 AND 8 THEN
      RAISE EXCEPTION 'Invalid condition group' USING ERRCODE = '22023';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_condition->'conditions') LOOP
      PERFORM public.platform_validate_condition(item);
      IF item->>'op' NOT IN ('exists','equals') THEN
        RAISE EXCEPTION 'Nested condition groups are unsupported' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Unsupported condition operator' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE FUNCTION public.platform_eval_condition(p_state JSONB, p_condition JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE op TEXT; item JSONB; result BOOLEAN;
BEGIN
  op := p_condition->>'op';
  IF op='exists' THEN
    RETURN (p_state #> string_to_array(p_condition->>'path', '.')) IS NOT NULL;
  ELSIF op='equals' THEN
    RETURN (p_state #> string_to_array(p_condition->>'path', '.')) = p_condition->'value';
  ELSIF op='all' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_condition->'conditions') LOOP
      IF NOT public.platform_eval_condition(p_state, item) THEN RETURN FALSE; END IF;
    END LOOP;
    RETURN TRUE;
  ELSIF op='any' THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_condition->'conditions') LOOP
      IF public.platform_eval_condition(p_state, item) THEN RETURN TRUE; END IF;
    END LOOP;
    RETURN FALSE;
  END IF;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_validate_run_definition(p_definition JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE node JSONB; current_id TEXT; visited TEXT[] := '{}'; frontier TEXT[]; node_count INTEGER;
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
  IF node_count NOT BETWEEN 1 AND 64 OR node_count <> (SELECT count(DISTINCT n->>'id') FROM jsonb_array_elements(p_definition->'nodes') n) THEN
    RAISE EXCEPTION 'Invalid node count or duplicate node IDs' USING ERRCODE = '22023';
  END IF;
  FOR node IN SELECT value FROM jsonb_array_elements(p_definition->'nodes') LOOP
    IF COALESCE(node->>'id','') !~ '^[a-z][a-z0-9_-]{0,63}$'
      OR COALESCE(node->>'kind','') NOT IN ('checkpoint','complete','condition') THEN
      RAISE EXCEPTION 'Unsupported node' USING ERRCODE = '22023';
    END IF;
    IF node->>'kind'='checkpoint' THEN
      IF COALESCE(node->>'type','') NOT IN ('question','approval','effect_gate')
        OR COALESCE(char_length(btrim(node->>'prompt')),0) NOT BETWEEN 1 AND 2000
        OR COALESCE(node->>'next','') !~ '^[a-z][a-z0-9_-]{0,63}$' THEN
        RAISE EXCEPTION 'Invalid checkpoint' USING ERRCODE = '22023';
      END IF;
      IF node->>'type'='question' THEN
        IF COALESCE(node#>>'{responseSchema,type}','') NOT IN ('string','number','boolean') THEN
          RAISE EXCEPTION 'Unsupported response schema' USING ERRCODE = '22023';
        END IF;
        IF node->'responseSchema' ? 'enum' AND (node#>>'{responseSchema,type}' <> 'string' OR jsonb_typeof(node#>'{responseSchema,enum}') IS DISTINCT FROM 'array') THEN
          RAISE EXCEPTION 'Invalid response choices' USING ERRCODE = '22023';
        END IF;
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
    ELSIF node->>'kind'='condition' THEN
      IF NOT public.platform_json_keys_allowed(node, ARRAY['id','kind','condition','whenTrue','whenFalse'])
        OR COALESCE(node->>'whenTrue','') !~ '^[a-z][a-z0-9_-]{0,63}$'
        OR COALESCE(node->>'whenFalse','') !~ '^[a-z][a-z0-9_-]{0,63}$' THEN
        RAISE EXCEPTION 'Invalid condition node' USING ERRCODE = '22023';
      END IF;
      PERFORM public.platform_validate_condition(node->'condition');
    ELSIF NOT public.platform_json_keys_allowed(node, ARRAY['id','kind']) THEN
      RAISE EXCEPTION 'Invalid complete node' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  frontier := ARRAY[p_definition->>'entry'];
  WHILE cardinality(frontier) > 0 LOOP
    current_id := frontier[cardinality(frontier)];
    frontier := frontier[1:cardinality(frontier)-1];
    IF current_id = ANY(visited) THEN RAISE EXCEPTION 'Workflow cycles or converging branches are unsupported' USING ERRCODE = '22023'; END IF;
    SELECT value INTO node FROM jsonb_array_elements(p_definition->'nodes') WHERE value->>'id'=current_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing node or workflow branch' USING ERRCODE = '22023'; END IF;
    visited := array_append(visited,current_id);
    IF node->>'kind'='checkpoint' THEN frontier := array_append(frontier,node->>'next');
    ELSIF node->>'kind'='condition' THEN
      frontier := array_append(frontier,node->>'whenTrue');
      frontier := array_append(frontier,node->>'whenFalse');
    END IF;
  END LOOP;
  IF cardinality(visited) <> node_count THEN RAISE EXCEPTION 'Unreachable nodes' USING ERRCODE = '22023'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_tick_run(p_job_id UUID, p_lease_token UUID)
RETURNS TABLE(run_id UUID, run_status TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE job public.workflow_jobs%ROWTYPE; saved public.platform_runs%ROWTYPE; node JSONB; authorized BOOLEAN := true;
  next_node TEXT; next_generation INTEGER;
BEGIN
  SELECT * INTO job FROM public.workflow_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR p_lease_token IS NULL OR job.workflow_key <> 'platform_run' OR job.trigger_kind <> 'event' OR job.payload_version <> 1
    OR job.status <> 'running' OR job.lease_token IS DISTINCT FROM p_lease_token OR job.lease_until IS NULL OR job.lease_until <= clock_timestamp() THEN
    RAISE EXCEPTION 'Invalid platform job lease' USING ERRCODE='40001';
  END IF;
  BEGIN PERFORM public.platform_require_run_role(job.user_id,(job.payload->>'workspaceId')::UUID,ARRAY['owner','admin','member']);
  EXCEPTION WHEN insufficient_privilege THEN authorized := false; END;
  SELECT * INTO saved FROM public.platform_runs WHERE id=(job.payload->>'runId')::UUID AND workspace_id=(job.payload->>'workspaceId')::UUID AND requested_by=job.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE='P0002'; END IF;
  IF job.event_key IS DISTINCT FROM 'run:' || saved.id || ':' || (job.payload->>'generation') THEN RAISE EXCEPTION 'Invalid platform event identity' USING ERRCODE='22023'; END IF;
  IF saved.status='ready' AND saved.state->'generation'=job.payload->'generation' THEN
    IF NOT authorized THEN
      UPDATE public.platform_runs SET status='blocked',revision=revision+1,updated_at=now() WHERE id=saved.id RETURNING * INTO saved;
    ELSE
      SELECT value INTO node FROM jsonb_array_elements(saved.definition->'nodes') WHERE value->>'id'=saved.state->>'node';
      IF node->>'kind'='checkpoint' THEN
        INSERT INTO public.platform_checkpoints(workspace_id,run_id,node_id,type,prompt,response_schema,target)
        VALUES(saved.workspace_id,saved.id,node->>'id',node->>'type',node->>'prompt',node->'responseSchema',node->'target');
        UPDATE public.platform_runs SET status='waiting',revision=revision+1,updated_at=now() WHERE id=saved.id RETURNING * INTO saved;
      ELSIF node->>'kind'='condition' THEN
        next_generation := (saved.state->>'generation')::INTEGER + 1;
        next_node := CASE WHEN public.platform_eval_condition(saved.state,node->'condition') THEN node->>'whenTrue' ELSE node->>'whenFalse' END;
        UPDATE public.platform_runs SET state=jsonb_set(jsonb_set(state,'{node}',to_jsonb(next_node)), '{generation}',to_jsonb(next_generation)), revision=revision+1, updated_at=now() WHERE id=saved.id RETURNING * INTO saved;
        IF NOT EXISTS (SELECT 1 FROM public.workflow_event_contracts WHERE workflow_key='platform_run' AND enabled) THEN RAISE EXCEPTION 'Platform worker admission is disabled' USING ERRCODE='55000'; END IF;
        PERFORM public.enqueue_workflow_event(saved.requested_by,'platform_run','run:' || saved.id || ':' || next_generation,jsonb_build_object('runId',saved.id,'workspaceId',saved.workspace_id,'generation',next_generation),1,NULL);
      ELSIF node->>'kind'='complete' THEN
        UPDATE public.platform_runs SET status='completed',revision=revision+1,updated_at=now() WHERE id=saved.id RETURNING * INTO saved;
      ELSE RAISE EXCEPTION 'Unsupported run node' USING ERRCODE='22023'; END IF;
    END IF;
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(saved.workspace_id,job.user_id,'service','run.transition','platform_run',saved.id::TEXT,jsonb_build_object('status',saved.status,'revision',saved.revision,'jobId',job.id));
  END IF;
  IF NOT public.complete_workflow_job_with_result(job.id,p_lease_token,'platform_run',saved.id,NULL) THEN RAISE EXCEPTION 'Platform lease expired before commit' USING ERRCODE='40001'; END IF;
  RETURN QUERY SELECT saved.id,saved.status;
END;
$$;

-- Keep manifest admission aligned with the run interpreter. Condition nodes are
-- still inert: only checkpoint/complete nodes can reach provider execution.
CREATE OR REPLACE FUNCTION public.platform_validate_app_manifest(manifest JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path=public AS $$
DECLARE workflow JSONB; node JSONB; artifact RECORD; allowed TEXT[];
BEGIN
  IF manifest IS NULL OR NOT public.platform_json_keys_allowed(manifest,ARRAY['schemaVersion','key','version','title','inputSchema','workflows','capabilities','artifactSchemas','settingsSchema'])
    OR manifest->'schemaVersion' IS DISTINCT FROM '1'::JSONB OR COALESCE(manifest->>'key','') !~ '^[a-z][a-z0-9_-]{0,63}$'
    OR COALESCE(manifest->>'version','') !~ '^[1-9][0-9]{0,8}$' OR jsonb_typeof(manifest->'version') IS DISTINCT FROM 'number'
    OR jsonb_typeof(manifest->'title') IS DISTINCT FROM 'string' OR char_length(btrim(manifest->>'title')) NOT BETWEEN 1 AND 160
    OR manifest->'capabilities' IS DISTINCT FROM '[]'::JSONB OR jsonb_typeof(manifest->'workflows') IS DISTINCT FROM 'array'
    OR jsonb_typeof(manifest->'artifactSchemas') IS DISTINCT FROM 'object' OR octet_length(manifest::TEXT)>131072 THEN
    RAISE EXCEPTION 'Unsupported app manifest' USING ERRCODE='22023';
  END IF;
  PERFORM public.platform_validate_manifest_object(manifest->'inputSchema');
  PERFORM public.platform_validate_manifest_object(manifest->'settingsSchema');
  IF jsonb_array_length(manifest->'workflows') NOT BETWEEN 1 AND 16 OR
    (SELECT count(DISTINCT v->>'key') FROM jsonb_array_elements(manifest->'workflows') v)<>jsonb_array_length(manifest->'workflows') THEN
    RAISE EXCEPTION 'Invalid workflow keys' USING ERRCODE='22023';
  END IF;
  FOR workflow IN SELECT * FROM jsonb_array_elements(manifest->'workflows') LOOP
    PERFORM public.platform_validate_run_definition(workflow);
    IF NOT public.platform_json_keys_allowed(workflow,ARRAY['schemaVersion','key','version','entry','nodes']) THEN
      RAISE EXCEPTION 'Unknown workflow fields' USING ERRCODE='22023';
    END IF;
    FOR node IN SELECT * FROM jsonb_array_elements(workflow->'nodes') LOOP
      allowed:=CASE WHEN node->>'kind'='complete' THEN ARRAY['id','kind']
        WHEN node->>'kind'='condition' THEN ARRAY['id','kind','condition','whenTrue','whenFalse']
        WHEN node->>'type'='question' THEN ARRAY['id','kind','type','prompt','next','responseSchema']
        ELSE ARRAY['id','kind','type','prompt','next','target'] END;
      IF NOT public.platform_json_keys_allowed(node,allowed) THEN RAISE EXCEPTION 'Unknown node fields' USING ERRCODE='22023'; END IF;
      IF node->>'type'='question' AND NOT public.platform_json_keys_allowed(node->'responseSchema',ARRAY['type','enum']) THEN
        RAISE EXCEPTION 'Unknown response fields' USING ERRCODE='22023';
      END IF;
      IF node ? 'target' AND NOT public.platform_json_keys_allowed(node->'target',ARRAY['resourceType','resourceId','revision','contentHash','action','audienceHash']) THEN
        RAISE EXCEPTION 'Unknown target fields' USING ERRCODE='22023';
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(*) FROM jsonb_object_keys(manifest->'artifactSchemas'))>16 THEN RAISE EXCEPTION 'Too many artifact schemas' USING ERRCODE='22023'; END IF;
  FOR artifact IN SELECT * FROM jsonb_each(manifest->'artifactSchemas') LOOP
    IF artifact.key !~ '^[a-z][a-z0-9_-]{0,63}$' THEN RAISE EXCEPTION 'Invalid artifact key' USING ERRCODE='22023'; END IF;
    PERFORM public.platform_validate_manifest_object(artifact.value);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_validate_condition(JSONB), public.platform_eval_condition(JSONB,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_validate_condition(JSONB), public.platform_eval_condition(JSONB,JSONB) TO service_role;
