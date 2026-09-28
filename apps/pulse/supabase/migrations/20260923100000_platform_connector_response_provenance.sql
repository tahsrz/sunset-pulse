-- Connector response provenance only. Payloads are validated in the server
-- adapter and are not persisted here.

CREATE TABLE public.platform_connector_response_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.platform_workspaces(id),
  run_id UUID NOT NULL,
  reservation_id UUID NOT NULL REFERENCES public.platform_capability_reservations(id),
  snapshot_id UUID NOT NULL REFERENCES public.platform_connector_schema_snapshots(id),
  operation_id UUID NOT NULL,
  response_hash TEXT NOT NULL CHECK (response_hash ~ '^[a-f0-9]{64}$'),
  snapshot_hash TEXT NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL CHECK (status IN ('valid','schema_drift')),
  provenance JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(provenance)='object' AND octet_length(provenance::TEXT)<=8192),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,operation_id)
);
ALTER TABLE public.platform_connector_response_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_connector_response_events_read ON public.platform_connector_response_events FOR SELECT TO authenticated
  USING (public.platform_can_read_runs(workspace_id));
REVOKE ALL ON public.platform_connector_response_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.platform_connector_response_events TO authenticated, service_role;

CREATE FUNCTION public.platform_record_connector_response(
  p_workspace_id UUID, p_run_id UUID, p_reservation_id UUID, p_snapshot_id UUID,
  p_operation_id UUID, p_response_hash TEXT, p_expected_snapshot_hash TEXT,
  p_status TEXT, p_provenance JSONB
)
RETURNS SETOF public.platform_connector_response_events LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved public.platform_connector_response_events%ROWTYPE; reservation public.platform_capability_reservations%ROWTYPE; snapshot public.platform_connector_schema_snapshots%ROWTYPE; run public.platform_runs%ROWTYPE;
BEGIN
  IF p_response_hash !~ '^[a-f0-9]{64}$' OR p_expected_snapshot_hash !~ '^[a-f0-9]{64}$'
    OR p_status NOT IN ('valid','schema_drift') OR p_provenance IS NULL OR jsonb_typeof(p_provenance) IS DISTINCT FROM 'object'
    OR octet_length(p_provenance::TEXT)>8192 OR NOT public.platform_json_keys_allowed(p_provenance,ARRAY['source','fixture','recordedAt']) THEN
    RAISE EXCEPTION 'Invalid response provenance' USING ERRCODE='22023';
  END IF;
  SELECT * INTO reservation FROM public.platform_capability_reservations WHERE id=p_reservation_id AND workspace_id=p_workspace_id FOR SHARE;
  IF NOT FOUND OR reservation.run_id<>p_run_id OR reservation.operation_id<>p_operation_id THEN
    RAISE EXCEPTION 'Reservation is outside response operation' USING ERRCODE='42501';
  END IF;
  SELECT * INTO snapshot FROM public.platform_connector_schema_snapshots WHERE id=p_snapshot_id AND workspace_id=p_workspace_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schema snapshot is outside workspace' USING ERRCODE='42501'; END IF;
  SELECT * INTO run FROM public.platform_runs WHERE id=p_run_id AND workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Run is outside workspace' USING ERRCODE='42501'; END IF;
  IF p_status='valid' AND p_expected_snapshot_hash IS DISTINCT FROM snapshot.schema_hash THEN
    RAISE EXCEPTION 'Valid response has schema drift' USING ERRCODE='22023';
  END IF;
  IF p_status='schema_drift' AND p_expected_snapshot_hash=snapshot.schema_hash THEN
    RAISE EXCEPTION 'Schema drift requires a changed snapshot hash' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.platform_connector_response_events(workspace_id,run_id,reservation_id,snapshot_id,operation_id,response_hash,snapshot_hash,status,provenance)
    VALUES(p_workspace_id,p_run_id,p_reservation_id,p_snapshot_id,p_operation_id,p_response_hash,p_expected_snapshot_hash,p_status,p_provenance)
    ON CONFLICT (workspace_id,operation_id) DO NOTHING RETURNING * INTO saved;
  IF NOT FOUND THEN SELECT * INTO saved FROM public.platform_connector_response_events WHERE workspace_id=p_workspace_id AND operation_id=p_operation_id; RETURN NEXT saved; RETURN; END IF;
  IF p_status='schema_drift' AND run.status NOT IN ('completed','cancelled') THEN
    UPDATE public.platform_runs SET status='blocked',revision=revision+1,updated_at=now() WHERE id=p_run_id;
    INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
      VALUES(p_workspace_id,run.requested_by,'service','run.schema_drift','platform_run',p_run_id::TEXT,jsonb_build_object('snapshotId',p_snapshot_id,'operationId',p_operation_id));
  END IF;
  RETURN NEXT saved;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_record_connector_response(UUID,UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_record_connector_response(UUID,UUID,UUID,UUID,UUID,TEXT,TEXT,TEXT,JSONB) TO service_role;
