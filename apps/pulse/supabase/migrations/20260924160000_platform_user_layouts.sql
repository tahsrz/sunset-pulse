-- Per-user command-center presentation state. Layout rows do not contain runs,
-- checkpoints, executable commands, or workflow snapshots.
CREATE TABLE public.platform_user_layouts (
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  layout JSONB NOT NULL CHECK (jsonb_typeof(layout) = 'object' AND octet_length(layout::TEXT) <= 65536),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id),
  CHECK (layout->>'workspaceId' = workspace_id::TEXT),
  CHECK (layout->'schemaVersion' = '1'::JSONB)
);
CREATE INDEX platform_user_layouts_updated_idx ON public.platform_user_layouts(workspace_id, updated_at DESC, user_id);
ALTER TABLE public.platform_user_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_user_layouts_own_read ON public.platform_user_layouts FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_user_layouts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_user_layouts TO authenticated, service_role;

CREATE FUNCTION public.platform_validate_canvas_layout(p_workspace_id UUID, p_layout JSONB)
RETURNS VOID LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE item JSONB; win JSONB; target JSONB; kind TEXT; window_id UUID;
  seen UUID[] := '{}'; viewport JSONB; count_windows INTEGER;
BEGIN
  IF p_layout IS NULL OR jsonb_typeof(p_layout) <> 'object' OR octet_length(p_layout::TEXT) > 65536
    OR NOT public.platform_json_keys_allowed(p_layout, ARRAY['schemaVersion','workspaceId','viewport','windows'])
    OR NOT (p_layout ?& ARRAY['schemaVersion','workspaceId','viewport','windows'])
    OR jsonb_typeof(p_layout->'schemaVersion') <> 'number' OR p_layout->'schemaVersion' <> '1'::JSONB
    OR p_layout->>'workspaceId' IS DISTINCT FROM p_workspace_id::TEXT
    OR jsonb_typeof(p_layout->'viewport') <> 'object' OR jsonb_typeof(p_layout->'windows') <> 'array' THEN
    RAISE EXCEPTION 'Invalid canvas layout' USING ERRCODE = '22023';
  END IF;
  viewport := p_layout->'viewport';
  IF NOT public.platform_json_keys_allowed(viewport, ARRAY['x','y','zoom'])
    OR NOT (viewport ?& ARRAY['x','y','zoom'])
    OR jsonb_typeof(viewport->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(viewport->'y') IS DISTINCT FROM 'number'
    OR jsonb_typeof(viewport->'zoom') IS DISTINCT FROM 'number'
    OR (viewport->>'x')::NUMERIC NOT BETWEEN -100000 AND 100000
    OR (viewport->>'y')::NUMERIC NOT BETWEEN -100000 AND 100000
    OR (viewport->>'zoom')::NUMERIC NOT BETWEEN 0.25 AND 2 THEN
    RAISE EXCEPTION 'Invalid canvas viewport' USING ERRCODE = '22023';
  END IF;
  count_windows := jsonb_array_length(p_layout->'windows');
  IF count_windows > 32 THEN RAISE EXCEPTION 'Too many canvas windows' USING ERRCODE = '22023'; END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_layout->'windows') LOOP
    IF jsonb_typeof(item) <> 'object' OR NOT public.platform_json_keys_allowed(item, ARRAY['window','x','y','width','height','zIndex'])
      OR NOT (item ?& ARRAY['window','x','y','width','height','zIndex'])
      OR jsonb_typeof(item->'window') <> 'object'
      OR jsonb_typeof(item->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'y') IS DISTINCT FROM 'number'
      OR jsonb_typeof(item->'width') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'height') IS DISTINCT FROM 'number'
      OR jsonb_typeof(item->'zIndex') IS DISTINCT FROM 'number'
      OR (item->>'x')::NUMERIC NOT BETWEEN -100000 AND 100000 OR (item->>'y')::NUMERIC NOT BETWEEN -100000 AND 100000
      OR (item->>'width')::NUMERIC NOT BETWEEN 240 AND 4096 OR (item->>'height')::NUMERIC NOT BETWEEN 160 AND 4096
      OR (item->>'zIndex')::NUMERIC NOT BETWEEN 0 AND 1000 OR trunc((item->>'zIndex')::NUMERIC) <> (item->>'zIndex')::NUMERIC THEN
      RAISE EXCEPTION 'Invalid canvas window bounds' USING ERRCODE = '22023';
    END IF;
    win := item->'window'; target := win->'target'; kind := win->>'kind';
    IF NOT (win ?& ARRAY['id','kind','target']) OR jsonb_typeof(win->'id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(win->'kind') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid canvas window ID' USING ERRCODE = '22023'; END IF;
    BEGIN window_id := (win->>'id')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid canvas window ID' USING ERRCODE = '22023'; END;
    IF window_id = ANY(seen) THEN RAISE EXCEPTION 'Duplicate canvas window ID' USING ERRCODE = '22023'; END IF;
    seen := array_append(seen, window_id);
    IF jsonb_typeof(target) IS DISTINCT FROM 'object' OR NOT (target ? 'workspaceId')
      OR target->>'workspaceId' IS DISTINCT FROM p_workspace_id::TEXT THEN
      RAISE EXCEPTION 'Canvas target workspace mismatch' USING ERRCODE = '22023';
    END IF;
    CASE kind
      WHEN 'checkpoint_inbox' THEN
        IF NOT public.platform_json_keys_allowed(win, ARRAY['id','kind','target'])
          OR NOT public.platform_json_keys_allowed(target, ARRAY['workspaceId'])
          OR NOT (target ?& ARRAY['workspaceId']) THEN RAISE EXCEPTION 'Invalid inbox target' USING ERRCODE = '22023'; END IF;
      WHEN 'run_graph' THEN
        IF NOT public.platform_json_keys_allowed(win, ARRAY['id','kind','target'])
          OR NOT public.platform_json_keys_allowed(target, ARRAY['workspaceId','runId'])
          OR NOT (target ?& ARRAY['workspaceId','runId']) THEN RAISE EXCEPTION 'Invalid run target' USING ERRCODE = '22023'; END IF;
        BEGIN PERFORM (target->>'runId')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid run target' USING ERRCODE = '22023'; END;
      WHEN 'artifact_viewer' THEN
        IF NOT public.platform_json_keys_allowed(win, ARRAY['id','kind','target'])
          OR NOT public.platform_json_keys_allowed(target, ARRAY['workspaceId','artifactId','version'])
          OR NOT (target ?& ARRAY['workspaceId','artifactId','version'])
          OR jsonb_typeof(target->'version') IS DISTINCT FROM 'number' OR (target->>'version')::NUMERIC NOT BETWEEN 1 AND 2147483647
          OR trunc((target->>'version')::NUMERIC) <> (target->>'version')::NUMERIC THEN RAISE EXCEPTION 'Invalid artifact target' USING ERRCODE = '22023'; END IF;
        BEGIN PERFORM (target->>'artifactId')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid artifact target' USING ERRCODE = '22023'; END;
      WHEN 'system_monitor' THEN
        IF NOT public.platform_json_keys_allowed(win, ARRAY['id','kind','target'])
          OR NOT public.platform_json_keys_allowed(target, ARRAY['workspaceId','panel'])
          OR NOT (target ?& ARRAY['workspaceId','panel'])
          OR COALESCE(target->>'panel','') NOT IN ('scheduler','connectors','quotas') THEN RAISE EXCEPTION 'Invalid monitor target' USING ERRCODE = '22023'; END IF;
      ELSE RAISE EXCEPTION 'Unsupported canvas window kind' USING ERRCODE = '22023';
    END CASE;
  END LOOP;
END;
$$;

CREATE FUNCTION public.platform_save_user_layout(
  p_actor_id UUID, p_workspace_id UUID, p_layout JSONB, p_expected_revision INTEGER
) RETURNS SETOF public.platform_user_layouts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE saved public.platform_user_layouts%ROWTYPE;
BEGIN
  -- Layouts are personal presentation state; every active workspace role may
  -- maintain their own layout, without granting workspace-management rights.
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin','member','reviewer','viewer']);
  PERFORM public.platform_validate_canvas_layout(p_workspace_id,p_layout);
  IF p_expected_revision IS NULL THEN
    INSERT INTO public.platform_user_layouts(workspace_id,user_id,schema_version,layout)
      VALUES(p_workspace_id,p_actor_id,1,p_layout)
      ON CONFLICT(workspace_id,user_id) DO NOTHING RETURNING * INTO saved;
    IF FOUND THEN RETURN NEXT saved; RETURN; END IF;
    SELECT * INTO saved FROM public.platform_user_layouts WHERE workspace_id=p_workspace_id AND user_id=p_actor_id FOR UPDATE;
    IF saved.layout=p_layout THEN RETURN NEXT saved; RETURN; END IF;
    RAISE EXCEPTION 'Canvas layout revision conflict' USING ERRCODE='40001';
  END IF;
  IF p_expected_revision <= 0 THEN RAISE EXCEPTION 'Invalid layout revision' USING ERRCODE='22023'; END IF;
  SELECT * INTO saved FROM public.platform_user_layouts WHERE workspace_id=p_workspace_id AND user_id=p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canvas layout not found' USING ERRCODE='P0002'; END IF;
  IF saved.revision<>p_expected_revision THEN RAISE EXCEPTION 'Canvas layout revision conflict' USING ERRCODE='40001'; END IF;
  UPDATE public.platform_user_layouts SET layout=p_layout,revision=revision+1,updated_at=now()
    WHERE workspace_id=p_workspace_id AND user_id=p_actor_id RETURNING * INTO saved;
  RETURN NEXT saved;
END $$;

REVOKE ALL ON FUNCTION public.platform_validate_canvas_layout(UUID,JSONB),
  public.platform_save_user_layout(UUID,UUID,JSONB,INTEGER) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_save_user_layout(UUID,UUID,JSONB,INTEGER) TO service_role;
