-- Reviewers can inspect connector-health history without receiving a direct
-- grant to the workspace's general audit-event table.
CREATE INDEX platform_connector_health_audit_workspace_occurred_idx
  ON public.platform_audit_events (workspace_id, occurred_at DESC, id DESC)
  WHERE action IN ('connector.health.scheduled', 'connector.health.receipt_recorded');

CREATE FUNCTION public.platform_list_connector_health_audit(
  p_actor_id UUID,
  p_workspace_id UUID,
  p_after TIMESTAMPTZ,
  p_after_id UUID,
  p_limit INTEGER
)
RETURNS TABLE(
  id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  actor_kind TEXT,
  safe_metadata JSONB,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.platform_require_run_role(
    p_actor_id,
    p_workspace_id,
    ARRAY['owner','admin','member','reviewer','viewer']
  );
  IF p_limit NOT BETWEEN 1 AND 101 OR ((p_after IS NULL) <> (p_after_id IS NULL)) THEN
    RAISE EXCEPTION 'Invalid connector health audit page' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT event.id, event.action, event.resource_type, event.resource_id,
    event.actor_kind, event.safe_metadata, event.occurred_at
  FROM public.platform_audit_events AS event
  WHERE event.workspace_id = p_workspace_id
    AND event.action IN ('connector.health.scheduled', 'connector.health.receipt_recorded')
    AND (p_after IS NULL OR (event.occurred_at,event.id) < (p_after,p_after_id))
  ORDER BY event.occurred_at DESC, event.id DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_list_connector_health_audit(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_connector_health_audit(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.platform_list_connector_health_audit(UUID,UUID,TIMESTAMPTZ,UUID,INTEGER) IS
  'Returns a bounded, connector-health-only audit projection for one authorized workspace.';
