-- Bounded summary for the shared inbox. The caller has already passed the
-- workspace access boundary; this function returns counts only, never details.
CREATE FUNCTION public.platform_connector_health_summary(p_workspace_id UUID)
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT health.status, COUNT(*)::BIGINT
  FROM public.platform_connector_health AS health
  WHERE health.workspace_id = p_workspace_id
  GROUP BY health.status;
$$;

REVOKE ALL ON FUNCTION public.platform_connector_health_summary(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_connector_health_summary(UUID) TO service_role;
