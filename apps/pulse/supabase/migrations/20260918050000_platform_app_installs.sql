-- Stored manifests are inert data. No tools, code evaluation or provider calls.
CREATE FUNCTION public.platform_json_keys_allowed(value JSONB, allowed TEXT[])
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT jsonb_typeof(value)='object' AND (value - allowed)='{}'::JSONB;
$$;
CREATE FUNCTION public.platform_validate_manifest_object(spec JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path=public AS $$
DECLARE field RECORD; required JSONB; keys TEXT[]; value JSONB;
BEGIN
  IF spec IS NULL OR NOT public.platform_json_keys_allowed(spec,ARRAY['type','properties','required','additionalProperties'])
    OR spec->>'type' IS DISTINCT FROM 'object' OR spec->'additionalProperties' IS DISTINCT FROM 'false'::JSONB
    OR jsonb_typeof(spec->'properties') IS DISTINCT FROM 'object' OR jsonb_typeof(spec->'required') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Unsupported object schema' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(spec->'properties'))>64 OR jsonb_array_length(spec->'required')>64 THEN
    RAISE EXCEPTION 'Too many schema fields' USING ERRCODE='22023';
  END IF;
  FOR required IN SELECT * FROM jsonb_array_elements(spec->'required') LOOP
    IF jsonb_typeof(required)<>'string' OR NOT ((spec->'properties') ? (required#>>'{}')) THEN
      RAISE EXCEPTION 'Unknown required field' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT v) FROM jsonb_array_elements(spec->'required') v)<>jsonb_array_length(spec->'required') THEN
    RAISE EXCEPTION 'Duplicate required field' USING ERRCODE='22023';
  END IF;
  FOR field IN SELECT * FROM jsonb_each(spec->'properties') LOOP
    value:=field.value;
    IF field.key !~ '^[a-z][a-z0-9_-]{0,63}$' OR field.key='constructor' THEN
      RAISE EXCEPTION 'Invalid schema field' USING ERRCODE='22023';
    END IF;
    keys:=CASE value->>'type'
      WHEN 'string' THEN ARRAY['type','title','description','minLength','maxLength','enum']
      WHEN 'number' THEN ARRAY['type','title','description','minimum','maximum']
      WHEN 'boolean' THEN ARRAY['type','title','description'] ELSE NULL END;
    IF keys IS NULL OR NOT public.platform_json_keys_allowed(value,keys) THEN
      RAISE EXCEPTION 'Unsupported schema field' USING ERRCODE='22023';
    END IF;
    IF (value ? 'title' AND (jsonb_typeof(value->'title')<>'string' OR char_length(value->>'title') NOT BETWEEN 1 AND 160))
      OR (value ? 'description' AND (jsonb_typeof(value->'description')<>'string' OR char_length(value->>'description')>1000)) THEN
      RAISE EXCEPTION 'Invalid field labels' USING ERRCODE='22023';
    END IF;
    IF value->>'type'='string' THEN
      IF COALESCE(value->>'maxLength','') !~ '^[1-9][0-9]{0,3}$'
        OR (value ? 'minLength' AND COALESCE(value->>'minLength','') !~ '^[0-9]{1,4}$') THEN
        RAISE EXCEPTION 'String bounds required' USING ERRCODE='22023';
      END IF;
      IF (value->>'maxLength')::INTEGER>4000 OR COALESCE((value->>'minLength')::INTEGER,0)>(value->>'maxLength')::INTEGER THEN
        RAISE EXCEPTION 'Invalid string bounds' USING ERRCODE='22023';
      END IF;
      IF value ? 'enum' THEN
        IF jsonb_typeof(value->'enum')<>'array' THEN RAISE EXCEPTION 'Invalid enum' USING ERRCODE='22023'; END IF;
        IF jsonb_array_length(value->'enum') NOT BETWEEN 1 AND 30 OR EXISTS(
          SELECT 1 FROM jsonb_array_elements(value->'enum') AS choices(choice) WHERE jsonb_typeof(choice)<>'string'
          OR char_length(choice#>>'{}') NOT BETWEEN COALESCE((value->>'minLength')::INTEGER,0) AND (value->>'maxLength')::INTEGER
        ) THEN RAISE EXCEPTION 'Invalid enum' USING ERRCODE='22023'; END IF;
      END IF;
    ELSIF value->>'type'='number' THEN
      IF (value ? 'minimum' AND jsonb_typeof(value->'minimum')<>'number')
        OR (value ? 'maximum' AND jsonb_typeof(value->'maximum')<>'number') THEN
        RAISE EXCEPTION 'Invalid numeric bounds' USING ERRCODE='22023';
      END IF;
      IF (value->>'minimum')::NUMERIC>(value->>'maximum')::NUMERIC THEN
        RAISE EXCEPTION 'Invalid numeric bounds' USING ERRCODE='22023';
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION public.platform_validate_manifest_values(spec JSONB, vals JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path=public AS $$
DECLARE field RECORD; rule JSONB;
BEGIN
  IF vals IS NULL OR jsonb_typeof(vals)<>'object' OR octet_length(vals::TEXT)>65536 THEN
    RAISE EXCEPTION 'Invalid settings' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(spec->'required') k WHERE NOT (vals ? k)) THEN
    RAISE EXCEPTION 'Required setting missing' USING ERRCODE='22023';
  END IF;
  FOR field IN SELECT * FROM jsonb_each(vals) LOOP
    rule:=spec->'properties'->field.key;
    IF rule IS NULL OR jsonb_typeof(field.value) IS DISTINCT FROM rule->>'type' THEN
      RAISE EXCEPTION 'Unsupported setting' USING ERRCODE='22023';
    END IF;
    IF rule->>'type'='string' AND (
      char_length(field.value#>>'{}') NOT BETWEEN COALESCE((rule->>'minLength')::INTEGER,0) AND (rule->>'maxLength')::INTEGER
      OR (rule ? 'enum' AND NOT ((rule->'enum') @> jsonb_build_array(field.value)))
    ) THEN RAISE EXCEPTION 'Setting outside bounds' USING ERRCODE='22023'; END IF;
    IF rule->>'type'='number' AND ((field.value#>>'{}')::NUMERIC<(rule->>'minimum')::NUMERIC
      OR (field.value#>>'{}')::NUMERIC>(rule->>'maximum')::NUMERIC) THEN
      RAISE EXCEPTION 'Setting outside bounds' USING ERRCODE='22023';
    END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION public.platform_validate_app_manifest(manifest JSONB)
RETURNS VOID LANGUAGE plpgsql SET search_path=public AS $$
DECLARE workflow JSONB; node JSONB; artifact RECORD; allowed TEXT[];
BEGIN
  IF manifest IS NULL OR NOT public.platform_json_keys_allowed(manifest,ARRAY['schemaVersion','key','version','title','inputSchema','workflows','capabilities','artifactSchemas','settingsSchema'])
    OR manifest->'schemaVersion' IS DISTINCT FROM '1'::JSONB OR COALESCE(manifest->>'key','') !~ '^[a-z][a-z0-9_-]{0,63}$'
    OR COALESCE(manifest->>'version','') !~ '^[1-9][0-9]{0,8}$' OR jsonb_typeof(manifest->'version') IS DISTINCT FROM 'number'
    OR jsonb_typeof(manifest->'title') IS DISTINCT FROM 'string' OR char_length(btrim(manifest->>'title')) NOT BETWEEN 1 AND 160
    OR manifest->'capabilities' IS DISTINCT FROM '[]'::JSONB
    OR jsonb_typeof(manifest->'workflows') IS DISTINCT FROM 'array'
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

CREATE TABLE public.platform_app_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  app_key TEXT NOT NULL, manifest JSONB NOT NULL, manifest_hash TEXT NOT NULL CHECK (manifest_hash ~ '^[a-f0-9]{64}$'),
  settings JSONB NOT NULL, status TEXT NOT NULL CHECK (status IN ('installed','disabled')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision>0), installed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,app_key), CHECK (app_key=manifest->>'key'),
  CHECK (jsonb_typeof(manifest)='object' AND octet_length(manifest::TEXT)<=131072),
  CHECK (jsonb_typeof(settings)='object' AND octet_length(settings::TEXT)<=65536)
);
ALTER TABLE public.platform_app_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_app_installs_read ON public.platform_app_installs FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_app_installs FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.platform_app_installs TO authenticated,service_role;

CREATE FUNCTION public.platform_save_app_install(p_actor_id UUID,p_workspace_id UUID,p_manifest JSONB,
  p_settings JSONB,p_status TEXT,p_expected_revision INTEGER)
RETURNS SETOF public.platform_app_installs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_app_installs%ROWTYPE; digest TEXT;
BEGIN
  PERFORM public.platform_require_run_role(p_actor_id,p_workspace_id,ARRAY['owner','admin']);
  PERFORM public.platform_validate_app_manifest(p_manifest);
  PERFORM public.platform_validate_manifest_values(p_manifest->'settingsSchema',p_settings);
  IF p_status IS NULL OR p_status NOT IN ('installed','disabled') THEN RAISE EXCEPTION 'Invalid install status' USING ERRCODE='22023'; END IF;
  digest:=encode(sha256(convert_to(p_manifest::TEXT,'UTF8')),'hex');
  IF p_expected_revision IS NULL THEN
    INSERT INTO public.platform_app_installs(workspace_id,app_key,manifest,manifest_hash,settings,status,installed_by)
      VALUES(p_workspace_id,p_manifest->>'key',p_manifest,digest,p_settings,p_status,p_actor_id)
      ON CONFLICT(workspace_id,app_key) DO NOTHING RETURNING * INTO saved;
    IF NOT FOUND THEN
      SELECT * INTO saved FROM public.platform_app_installs WHERE workspace_id=p_workspace_id AND app_key=p_manifest->>'key';
      IF saved.manifest=p_manifest AND saved.settings=p_settings AND saved.status=p_status THEN RETURN NEXT saved; RETURN; END IF;
      RAISE EXCEPTION 'App already installed' USING ERRCODE='40001';
    END IF;
  ELSE
    SELECT * INTO saved FROM public.platform_app_installs WHERE workspace_id=p_workspace_id AND app_key=p_manifest->>'key' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'App install not found' USING ERRCODE='P0002'; END IF;
    IF saved.revision<>p_expected_revision THEN RAISE EXCEPTION 'Install revision conflict' USING ERRCODE='40001'; END IF;
    IF (p_manifest->>'version')::INTEGER<(saved.manifest->>'version')::INTEGER
      OR (p_manifest->'version'=saved.manifest->'version' AND p_manifest<>saved.manifest) THEN
      RAISE EXCEPTION 'Manifest version is pinned' USING ERRCODE='40001';
    END IF;
    UPDATE public.platform_app_installs SET manifest=p_manifest,manifest_hash=digest,settings=p_settings,status=p_status,
      revision=revision+1,updated_at=now() WHERE id=saved.id RETURNING * INTO saved;
  END IF;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','app.install.saved','platform_app_install',saved.id::TEXT,
      jsonb_build_object('manifestHash',saved.manifest_hash,'version',p_manifest->'version','revision',saved.revision,'status',saved.status));
  -- No platform_runs rows are updated; admitted definitions remain pinned copies.
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_json_keys_allowed(JSONB,TEXT[]),public.platform_validate_manifest_object(JSONB),
  public.platform_validate_manifest_values(JSONB,JSONB),public.platform_validate_app_manifest(JSONB),
  public.platform_save_app_install(UUID,UUID,JSONB,JSONB,TEXT,INTEGER) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.platform_save_app_install(UUID,UUID,JSONB,JSONB,TEXT,INTEGER) TO service_role;
