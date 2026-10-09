-- The shared inbox needs connector scheduler freshness without exposing the
-- scheduler's complete job payloads to an application role.
CREATE INDEX workflow_jobs_connector_health_workspace_schedule_idx
  ON public.workflow_jobs ((payload->>'workspaceId'), scheduled_for DESC, id DESC)
  WHERE workflow_key = 'connector_health_check';

CREATE FUNCTION public.platform_list_connector_health_jobs(
  p_actor_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE(
  id UUID,
  status TEXT,
  scheduled_for TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  connector_id TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.platform_require_run_role(
    p_actor_id,
    p_workspace_id,
    ARRAY['owner','admin','member','reviewer','viewer']
  );
  RETURN QUERY
  SELECT job.id, job.status, job.scheduled_for, job.updated_at,
    NULLIF(job.payload->>'connectorId', '')
  FROM public.workflow_jobs AS job
  WHERE job.workflow_key = 'connector_health_check'
    AND job.payload->>'workspaceId' = p_workspace_id::TEXT
    AND job.status IN ('queued','deferred','running')
  ORDER BY job.scheduled_for DESC, job.id DESC
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_list_connector_health_jobs(UUID,UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_list_connector_health_jobs(UUID,UUID)
  TO service_role;

COMMENT ON FUNCTION public.platform_list_connector_health_jobs(UUID,UUID) IS
  'Returns at most 100 sanitized connector-health scheduler states for one authorized workspace; never returns job payloads.';
