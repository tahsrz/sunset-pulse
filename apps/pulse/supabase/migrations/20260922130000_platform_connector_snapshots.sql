-- Reviewed connector metadata and immutable schema snapshots. No credentials or
-- protocol calls are stored or executed here.

CREATE TABLE public.platform_connector_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  connection_id TEXT NOT NULL CHECK (connection_id ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  protocol TEXT NOT NULL CHECK (protocol IN ('mcp','openapi')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  endpoint TEXT NOT NULL CHECK (endpoint LIKE 'https://%'),
  auth_ref TEXT CHECK (auth_ref IS NULL OR auth_ref ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  definition JSONB NOT NULL,
  definition_hash TEXT NOT NULL CHECK (definition_hash ~ '^[a-f0-9]{64}$'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'reviewed' CHECK (status IN ('reviewed','disabled')),
  reviewed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, connection_id)
);
ALTER TABLE public.platform_connector_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_connector_definitions_read ON public.platform_connector_definitions FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_connector_definitions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_connector_definitions TO authenticated, service_role;

CREATE FUNCTION public.platform_save_connector_definition(
  p_actor_id UUID, p_workspace_id UUID, p_connection_id TEXT, p_protocol TEXT,
  p_title TEXT, p_endpoint TEXT, p_auth_ref TEXT, p_expected_revision INTEGER
)
RETURNS SETOF public.platform_connector_definitions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_connector_definitions%ROWTYPE; v_definition JSONB; digest TEXT;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF p_connection_id !~ '^[a-z][a-z0-9_.:-]{0,127}$' OR p_protocol NOT IN ('mcp','openapi')
    OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 160 OR p_endpoint NOT LIKE 'https://%'
    OR (p_auth_ref IS NOT NULL AND p_auth_ref !~ '^[a-z][a-z0-9_.:-]{0,127}$') THEN
    RAISE EXCEPTION 'Invalid connector definition' USING ERRCODE='22023';
  END IF;
  v_definition:=jsonb_build_object('schemaVersion',1,'connectionId',p_connection_id,'protocol',p_protocol,'title',btrim(p_title),'endpoint',p_endpoint,'authRef',p_auth_ref);
  digest:=encode(sha256(convert_to(v_definition::TEXT,'UTF8')),'hex');
  SELECT * INTO saved FROM public.platform_connector_definitions WHERE workspace_id=p_workspace_id AND connection_id=p_connection_id FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Connector revision conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.platform_connector_definitions(workspace_id,connection_id,protocol,title,endpoint,auth_ref,definition,definition_hash,reviewed_by)
      VALUES(p_workspace_id,p_connection_id,p_protocol,btrim(p_title),p_endpoint,p_auth_ref,v_definition,digest,p_actor_id) RETURNING * INTO saved;
  ELSE
    IF p_expected_revision IS DISTINCT FROM saved.revision THEN RAISE EXCEPTION 'Connector revision conflict' USING ERRCODE='40001'; END IF;
    UPDATE public.platform_connector_definitions SET protocol=p_protocol,title=btrim(p_title),endpoint=p_endpoint,auth_ref=p_auth_ref,
      definition=v_definition,definition_hash=digest,revision=revision+1,reviewed_by=p_actor_id,updated_at=now(),status='reviewed'
      WHERE id=saved.id RETURNING * INTO saved;
  END IF;
  RETURN NEXT saved;
END;
$$;

CREATE TABLE public.platform_connector_schema_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  connector_id UUID NOT NULL REFERENCES public.platform_connector_definitions(id),
  tool TEXT NOT NULL CHECK (tool ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  operation TEXT NOT NULL CHECK (operation ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  direction TEXT NOT NULL CHECK (direction IN ('input','output')),
  schema JSONB NOT NULL,
  schema_hash TEXT NOT NULL CHECK (schema_hash ~ '^[a-f0-9]{64}$'),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connector_id,tool,operation,direction),
  CHECK (jsonb_typeof(schema)='object' AND octet_length(schema::TEXT)<=65536)
);
ALTER TABLE public.platform_connector_schema_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_connector_schema_snapshots_read ON public.platform_connector_schema_snapshots FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_connector_schema_snapshots FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_connector_schema_snapshots TO authenticated, service_role;

CREATE FUNCTION public.platform_save_connector_schema_snapshot(
  p_actor_id UUID, p_workspace_id UUID, p_connector_id UUID, p_tool TEXT, p_operation TEXT,
  p_direction TEXT, p_schema JSONB, p_expected_revision INTEGER
)
RETURNS SETOF public.platform_connector_schema_snapshots LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_connector_schema_snapshots%ROWTYPE; digest TEXT;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  IF NOT EXISTS (SELECT 1 FROM public.platform_connector_definitions WHERE id=p_connector_id AND workspace_id=p_workspace_id AND status='reviewed')
    OR p_tool !~ '^[a-z][a-z0-9_.:-]{0,127}$' OR p_operation !~ '^[a-z][a-z0-9_.:-]{0,127}$'
    OR p_direction NOT IN ('input','output') THEN
    RAISE EXCEPTION 'Invalid connector snapshot target' USING ERRCODE='22023';
  END IF;
  PERFORM public.platform_validate_manifest_object(p_schema);
  digest:=encode(sha256(convert_to(p_schema::TEXT,'UTF8')),'hex');
  SELECT * INTO saved FROM public.platform_connector_schema_snapshots WHERE connector_id=p_connector_id AND tool=p_tool AND operation=p_operation AND direction=p_direction FOR UPDATE;
  IF NOT FOUND THEN
    IF p_expected_revision IS NOT NULL THEN RAISE EXCEPTION 'Schema snapshot revision conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.platform_connector_schema_snapshots(workspace_id,connector_id,tool,operation,direction,schema,schema_hash,created_by)
      VALUES(p_workspace_id,p_connector_id,p_tool,p_operation,p_direction,p_schema,digest,p_actor_id) RETURNING * INTO saved;
  ELSE
    IF p_expected_revision IS DISTINCT FROM saved.revision THEN RAISE EXCEPTION 'Schema snapshot revision conflict' USING ERRCODE='40001'; END IF;
    UPDATE public.platform_connector_schema_snapshots SET schema=p_schema,schema_hash=digest,revision=revision+1,created_by=p_actor_id
      WHERE id=saved.id RETURNING * INTO saved;
  END IF;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_save_connector_definition(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_save_connector_definition(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.platform_save_connector_schema_snapshot(UUID,UUID,UUID,TEXT,TEXT,TEXT,JSONB,INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_save_connector_schema_snapshot(UUID,UUID,UUID,TEXT,TEXT,TEXT,JSONB,INTEGER) TO service_role;
