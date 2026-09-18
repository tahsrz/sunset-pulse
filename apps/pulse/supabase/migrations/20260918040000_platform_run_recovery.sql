-- Recovery never changes the requester; restoration of their authority is required.
ALTER TABLE public.platform_runs
  ADD COLUMN supersedes UUID,
  ADD COLUMN superseded_by UUID,
  ADD COLUMN supersession_reason TEXT CHECK (char_length(supersession_reason) BETWEEN 1 AND 500),
  ADD FOREIGN KEY (workspace_id,supersedes) REFERENCES public.platform_runs(workspace_id,id),
  ADD FOREIGN KEY (workspace_id,superseded_by) REFERENCES public.platform_runs(workspace_id,id),
  ADD UNIQUE (supersedes);

CREATE FUNCTION public.platform_recover_run(p_actor_id UUID,p_workspace_id UUID,p_run_id UUID,p_expected_revision INTEGER)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_runs%ROWTYPE; requester UUID; generation INTEGER;
BEGIN
  -- Acquire member locks before the run, in stable order for concurrent recoveries.
  SELECT requested_by INTO requester FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id;
  IF requester IS NULL THEN RAISE EXCEPTION 'Run not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  PERFORM public.platform_require_run_role(requester,p_workspace_id,ARRAY['owner','admin','member']);
  SELECT * INTO saved FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id FOR UPDATE;
  IF saved.status <> 'blocked' OR saved.revision IS DISTINCT FROM p_expected_revision OR saved.superseded_by IS NOT NULL THEN
    RAISE EXCEPTION 'Run revision conflict' USING ERRCODE='40001';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.workflow_event_contracts WHERE workflow_key='platform_run' AND enabled) THEN
    RAISE EXCEPTION 'Platform worker admission is disabled' USING ERRCODE='55000';
  END IF;
  generation := (saved.state->>'generation')::INTEGER+1;
  UPDATE public.platform_runs SET state=jsonb_set(state,'{generation}',to_jsonb(generation)),
    status='ready',revision=revision+1,updated_at=now() WHERE id=p_run_id RETURNING * INTO saved;
  PERFORM public.enqueue_workflow_event(requester,'platform_run','run:'||saved.id||':'||generation,
    jsonb_build_object('runId',saved.id,'workspaceId',saved.workspace_id,'generation',generation),1,NULL);
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id)
    VALUES(p_workspace_id,p_actor_id,'user','run.recovered','platform_run',p_run_id::TEXT);
  RETURN NEXT saved;
END;
$$;

-- Supersession forks a fresh pinned run. Prior graphs, resolved answers and
-- actor attribution remain intact; pending checkpoints are cancelled, not erased.
CREATE FUNCTION public.platform_supersede_run(p_actor_id UUID,p_workspace_id UUID,p_run_id UUID,p_expected_revision INTEGER,
  p_request_key UUID,p_definition JSONB,p_reason TEXT)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior public.platform_runs%ROWTYPE; replacement public.platform_runs%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member']);
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Supersession reason required' USING ERRCODE='22023';
  END IF;
  SELECT * INTO prior FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run not found' USING ERRCODE='P0002'; END IF;
  IF prior.superseded_by IS NOT NULL THEN
    SELECT * INTO replacement FROM public.platform_runs WHERE id=prior.superseded_by;
    IF replacement.request_key=p_request_key AND replacement.requested_by=p_actor_id
      AND replacement.definition=p_definition AND replacement.supersession_reason=btrim(p_reason)
      AND prior.revision=p_expected_revision+1 THEN RETURN NEXT replacement; RETURN; END IF;
    RAISE EXCEPTION 'Supersession conflict' USING ERRCODE='40001';
  END IF;
  IF prior.status NOT IN ('ready','waiting','blocked') OR prior.revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Run revision conflict' USING ERRCODE='40001';
  END IF;
  -- Share the admission-key lock with platform_start_run, including concurrent
  -- direct starts, so an existing run can never be adopted as a replacement.
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Request key required' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::TEXT||':'||p_actor_id||':'||p_request_key,0));
  -- A request key belonging to another run must not be repurposed as a replacement.
  IF EXISTS(SELECT 1 FROM public.platform_runs WHERE workspace_id=p_workspace_id AND requested_by=p_actor_id AND request_key=p_request_key) THEN
    RAISE EXCEPTION 'Request key content conflict' USING ERRCODE='40001';
  END IF;
  SELECT * INTO replacement FROM public.platform_start_run(p_actor_id,p_workspace_id,p_request_key,p_definition);
  -- A concurrent start with the same key is fenced by checking its relationship
  -- and revision under lock before linking it; no unrelated history is reused.
  SELECT * INTO replacement FROM public.platform_runs WHERE id=replacement.id FOR UPDATE;
  IF replacement.revision<>1 OR replacement.supersedes IS NOT NULL OR replacement.id=prior.id THEN
    RAISE EXCEPTION 'Replacement conflict' USING ERRCODE='40001';
  END IF;
  UPDATE public.platform_runs SET supersedes=prior.id,supersession_reason=btrim(p_reason)
    WHERE id=replacement.id RETURNING * INTO replacement;
  UPDATE public.platform_runs SET status='cancelled',superseded_by=replacement.id,revision=revision+1,updated_at=now() WHERE id=prior.id;
  UPDATE public.platform_checkpoints SET status='cancelled',revision=revision+1 WHERE run_id=prior.id AND status='pending';
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','run.superseded','platform_run',prior.id::TEXT,jsonb_build_object('replacementId',replacement.id));
  RETURN NEXT replacement;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_recover_run(UUID,UUID,UUID,INTEGER),public.platform_supersede_run(UUID,UUID,UUID,INTEGER,UUID,JSONB,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_recover_run(UUID,UUID,UUID,INTEGER),public.platform_supersede_run(UUID,UUID,UUID,INTEGER,UUID,JSONB,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.platform_start_run(p_actor_id UUID, p_workspace_id UUID, p_request_key UUID, p_definition JSONB)
RETURNS SETOF public.platform_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.platform_runs%ROWTYPE;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id, p_workspace_id, ARRAY['owner','admin','member']);
  PERFORM public.platform_validate_run_definition(p_definition);
  IF p_request_key IS NULL THEN RAISE EXCEPTION 'Request key required' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_workspace_id::TEXT||':'||p_actor_id||':'||p_request_key,0));
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
