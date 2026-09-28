-- Reviewed connector health evidence. This records checks; it never performs
-- network calls or stores credentials, response bodies, or authorization data.
CREATE TABLE public.platform_connector_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  connector_id UUID NOT NULL REFERENCES public.platform_connector_definitions(id),
  connection_id TEXT NOT NULL CHECK (connection_id ~ '^[a-z][a-z0-9_.:-]{0,127}$'),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  status TEXT NOT NULL CHECK (status IN ('healthy','unavailable','schema_drift','stale')),
  checked_at TIMESTAMPTZ NOT NULL,
  snapshot_hash TEXT CHECK (snapshot_hash IS NULL OR snapshot_hash ~ '^[a-f0-9]{64}$'),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object' AND octet_length(detail::text) <= 4096),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, connector_id)
);
ALTER TABLE public.platform_connector_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_connector_health_read ON public.platform_connector_health FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_connector_health FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_connector_health TO authenticated, service_role;

CREATE FUNCTION public.platform_record_connector_health(
  p_workspace_id UUID, p_connector_id UUID, p_status TEXT, p_checked_at TIMESTAMPTZ,
  p_snapshot_hash TEXT, p_detail JSONB
)
RETURNS SETOF public.platform_connector_health LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE connector public.platform_connector_definitions%ROWTYPE; saved public.platform_connector_health%ROWTYPE;
BEGIN
  IF p_status NOT IN ('healthy','unavailable','schema_drift','stale')
    OR p_snapshot_hash IS NOT NULL AND p_snapshot_hash !~ '^[a-f0-9]{64}$'
    OR p_detail IS NULL OR jsonb_typeof(p_detail) <> 'object' OR octet_length(p_detail::text) > 4096
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_detail) AS key WHERE key NOT IN ('source','reason','probe','operation','responseHash','snapshotHash')) THEN
    RAISE EXCEPTION 'Invalid connector health evidence' USING ERRCODE='22023';
  END IF;
  SELECT * INTO connector FROM public.platform_connector_definitions WHERE id=p_connector_id AND workspace_id=p_workspace_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Connector not found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.platform_connector_health(workspace_id,connector_id,connection_id,title,status,checked_at,snapshot_hash,detail)
    VALUES(p_workspace_id,p_connector_id,connector.connection_id,connector.title,p_status,p_checked_at,p_snapshot_hash,p_detail)
  ON CONFLICT (workspace_id,connector_id) DO UPDATE SET
    connection_id=EXCLUDED.connection_id,title=EXCLUDED.title,status=EXCLUDED.status,
    checked_at=EXCLUDED.checked_at,snapshot_hash=EXCLUDED.snapshot_hash,detail=EXCLUDED.detail,updated_at=now()
  RETURNING * INTO saved;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_record_connector_health(UUID,UUID,TEXT,TIMESTAMPTZ,TEXT,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_connector_health(UUID,UUID,TEXT,TIMESTAMPTZ,TEXT,JSONB) TO service_role;
