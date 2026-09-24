-- Audit connector-health scheduling at the existing workflow-job admission
-- boundary. Replays do not create a second event because this is insert-only.
CREATE OR REPLACE FUNCTION public.platform_audit_connector_health_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE workspace_id UUID; connector_id UUID;
BEGIN
  IF NEW.workflow_key <> 'connector_health_check' OR NEW.trigger_kind <> 'event' THEN RETURN NEW; END IF;
  BEGIN workspace_id := (NEW.payload->>'workspaceId')::UUID; connector_id := (NEW.payload->>'connectorId')::UUID; EXCEPTION WHEN invalid_text_representation THEN RETURN NEW; END;
  IF workspace_id IS NULL OR connector_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
  VALUES(workspace_id,NEW.user_id,'user','connector.health.scheduled','connector_health',connector_id::text,
    jsonb_build_object('jobId',NEW.id,'eventKey',NEW.event_key,'scheduledFor',NEW.scheduled_for,'workflowKey',NEW.workflow_key));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS platform_connector_health_schedule_audit ON public.workflow_jobs;
CREATE TRIGGER platform_connector_health_schedule_audit
  AFTER INSERT ON public.workflow_jobs
  FOR EACH ROW EXECUTE FUNCTION public.platform_audit_connector_health_schedule();
REVOKE ALL ON FUNCTION public.platform_audit_connector_health_schedule() FROM PUBLIC, anon, authenticated, service_role;
