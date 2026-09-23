-- Append-only operational evidence for connector checks. This stores bounded
-- metadata only; it never stores credentials, response bodies or provider data.
CREATE TABLE public.platform_connector_health_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  connector_id UUID NOT NULL REFERENCES public.platform_connector_definitions(id),
  health_id UUID NOT NULL REFERENCES public.platform_connector_health(id),
  status TEXT NOT NULL CHECK (status IN ('healthy','unavailable','schema_drift','stale')),
  checked_at TIMESTAMPTZ NOT NULL,
  snapshot_hash TEXT CHECK (snapshot_hash IS NULL OR snapshot_hash ~ '^[a-f0-9]{64}$'),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(detail) = 'object' AND octet_length(detail::text) <= 4096),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX platform_connector_health_history_scope_idx
  ON public.platform_connector_health_history(workspace_id, recorded_at DESC, id DESC);
ALTER TABLE public.platform_connector_health_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_connector_health_history_read ON public.platform_connector_health_history FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_connector_health_history FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_connector_health_history TO authenticated, service_role;

CREATE TABLE public.platform_connector_health_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  connector_id UUID NOT NULL REFERENCES public.platform_connector_definitions(id),
  operation_id UUID NOT NULL,
  health_id UUID NOT NULL REFERENCES public.platform_connector_health(id),
  status TEXT NOT NULL CHECK (status IN ('healthy','unavailable','schema_drift','stale')),
  result_hash TEXT NOT NULL CHECK (result_hash ~ '^[a-f0-9]{64}$'),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, operation_id)
);
ALTER TABLE public.platform_connector_health_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_connector_health_receipts_read ON public.platform_connector_health_receipts FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_connector_health_receipts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_connector_health_receipts TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.platform_record_connector_health_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.platform_connector_health_history(workspace_id,connector_id,health_id,status,checked_at,snapshot_hash,detail)
  VALUES(NEW.workspace_id,NEW.connector_id,NEW.id,NEW.status,NEW.checked_at,NEW.snapshot_hash,NEW.detail);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS platform_connector_health_history_capture ON public.platform_connector_health;
CREATE TRIGGER platform_connector_health_history_capture
  AFTER INSERT OR UPDATE OF status,checked_at,snapshot_hash,detail ON public.platform_connector_health
  FOR EACH ROW EXECUTE FUNCTION public.platform_record_connector_health_history();

CREATE OR REPLACE FUNCTION public.platform_record_connector_health_receipt(
  p_workspace_id UUID, p_connector_id UUID, p_operation_id UUID, p_health_id UUID, p_status TEXT
)
RETURNS SETOF public.platform_connector_health_receipts
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_connector_health_receipts%ROWTYPE;
BEGIN
  IF p_operation_id IS NULL OR p_status NOT IN ('healthy','unavailable','schema_drift','stale') THEN
    RAISE EXCEPTION 'Invalid connector health receipt' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.platform_connector_health WHERE id=p_health_id AND workspace_id=p_workspace_id AND connector_id=p_connector_id AND status=p_status) THEN
    RAISE EXCEPTION 'Connector health receipt target not found' USING ERRCODE='P0002';
  END IF;
  INSERT INTO public.platform_connector_health_receipts(workspace_id,connector_id,operation_id,health_id,status,result_hash)
    VALUES(p_workspace_id,p_connector_id,p_operation_id,p_health_id,p_status,
      encode(sha256(convert_to(jsonb_build_object('connectorId',p_connector_id,'operationId',p_operation_id,'healthId',p_health_id,'status',p_status)::text,'UTF8')),'hex'))
    ON CONFLICT (workspace_id,operation_id) DO NOTHING
    RETURNING * INTO saved;
  IF NOT FOUND THEN
    SELECT * INTO saved FROM public.platform_connector_health_receipts WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id;
    IF saved.connector_id<>p_connector_id OR saved.health_id<>p_health_id OR saved.status<>p_status THEN
      RAISE EXCEPTION 'Connector health receipt identity conflict' USING ERRCODE='40001';
    END IF;
  END IF;
  RETURN NEXT saved;
END;
$$;
REVOKE ALL ON FUNCTION public.platform_record_connector_health_history() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.platform_record_connector_health_receipt(UUID,UUID,UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_connector_health_receipt(UUID,UUID,UUID,UUID,TEXT) TO service_role;
