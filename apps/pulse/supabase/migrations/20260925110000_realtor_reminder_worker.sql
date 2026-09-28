-- Deliver opt-in in-app planner reminders through the shared durable worker.
-- This queues no email, SMS, or paid-provider action.

INSERT INTO public.workflow_event_contracts(workflow_key,min_payload_version,max_payload_version,enabled)
VALUES('realtor_reminder',1,1,true)
ON CONFLICT(workflow_key) DO UPDATE SET min_payload_version=1,max_payload_version=1,enabled=true,updated_at=now();

CREATE OR REPLACE FUNCTION public.realtor_enqueue_reminder_job()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE opted_in BOOLEAN; occurrence public.realtor_planner_occurrences%ROWTYPE;
BEGIN
  IF NEW.status<>'scheduled' THEN RETURN NEW; END IF;
  SELECT reminders_enabled INTO opted_in FROM public.realtor_preferences
   WHERE user_id=NEW.user_id AND workspace_id=NEW.workspace_id;
  IF NOT COALESCE(opted_in,false) THEN RETURN NEW; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.workflow_event_contracts
    WHERE workflow_key='realtor_reminder' AND enabled AND min_payload_version<=1 AND max_payload_version>=1) THEN
    RETURN NEW;
  END IF;
  SELECT * INTO occurrence FROM public.realtor_planner_occurrences
   WHERE id=NEW.occurrence_id AND user_id=NEW.user_id AND workspace_id=NEW.workspace_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  PERFORM public.enqueue_workflow_event(
    NEW.user_id,'realtor_reminder','realtor-reminder:'||NEW.id::TEXT||':r'||NEW.revision,
    jsonb_build_object('workspaceId',NEW.workspace_id,'occurrenceId',NEW.occurrence_id,
      'occurrenceRevision',NEW.occurrence_revision,'reminderId',NEW.id,'reminderRevision',NEW.revision),1,NEW.scheduled_at
  );
  RETURN NEW;
END $$;

CREATE TRIGGER realtor_reminder_enqueue_event
AFTER INSERT OR UPDATE OF status,revision,scheduled_at ON public.realtor_reminders
FOR EACH ROW EXECUTE FUNCTION public.realtor_enqueue_reminder_job();

CREATE OR REPLACE FUNCTION public.realtor_update_reminder(
  p_actor_id UUID,p_workspace_id UUID,p_reminder_id UUID,p_expected_revision INTEGER,
  p_request_key UUID,p_action TEXT,p_until TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE(reminder_id UUID,revision INTEGER,status TEXT,reused BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reminder public.realtor_reminders%ROWTYPE; receipt public.realtor_mutation_receipts%ROWTYPE; input_hash TEXT;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id) THEN RAISE EXCEPTION 'Reminder access denied' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('dismiss','snooze') OR p_request_key IS NULL
    OR (p_action='snooze' AND (p_until IS NULL OR p_until<=clock_timestamp() OR p_until>clock_timestamp()+interval '30 days'))
    OR (p_action='dismiss' AND p_until IS NOT NULL) THEN RAISE EXCEPTION 'Invalid reminder action' USING ERRCODE='22023'; END IF;
  input_hash:=encode(digest(jsonb_build_object('workspace',p_workspace_id,'reminder',p_reminder_id,
    'revision',p_expected_revision,'action',p_action,'until',p_until)::text,'sha256'),'hex');
  SELECT * INTO receipt FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=p_request_key;
  IF FOUND THEN
    IF receipt.operation<>'reminder' OR receipt.input_hash<>input_hash THEN RAISE EXCEPTION 'Request key conflict' USING ERRCODE='23505'; END IF;
    RETURN QUERY SELECT receipt.resource_id,receipt.resource_revision,receipt.response->>'status',TRUE; RETURN;
  END IF;
  SELECT * INTO reminder FROM public.realtor_reminders r WHERE r.id=p_reminder_id AND r.user_id=p_actor_id
    AND r.workspace_id=p_workspace_id FOR UPDATE;
  IF NOT FOUND OR reminder.revision<>p_expected_revision OR reminder.status NOT IN ('visible','scheduled') THEN
    RAISE EXCEPTION 'Reminder changed' USING ERRCODE='40001';
  END IF;
  UPDATE public.realtor_reminders AS target SET
    status=CASE WHEN p_action='dismiss' THEN 'dismissed' ELSE 'scheduled' END,
    scheduled_at=CASE WHEN p_action='snooze' THEN p_until ELSE target.scheduled_at END,
    snoozed_until=CASE WHEN p_action='snooze' THEN p_until ELSE NULL END,
    revision=target.revision+1,updated_at=now()
  WHERE target.id=reminder.id RETURNING target.* INTO reminder;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
    VALUES(p_actor_id,p_request_key,'reminder',input_hash,reminder.id,reminder.revision,jsonb_build_object('status',reminder.status));
  INSERT INTO public.platform_audit_events(workspace_id,actor_id,actor_kind,action,resource_type,resource_id,safe_metadata)
    VALUES(p_workspace_id,p_actor_id,'user','realtor.reminder.'||p_action,'realtor_reminder',reminder.id::TEXT,
      jsonb_build_object('revision',reminder.revision));
  RETURN QUERY SELECT reminder.id,reminder.revision,reminder.status,FALSE;
END $$;

CREATE OR REPLACE FUNCTION public.realtor_commit_reminder_job(p_job_id UUID,p_lease_token UUID)
RETURNS TABLE(committed BOOLEAN,result_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job public.workflow_jobs%ROWTYPE; reminder public.realtor_reminders%ROWTYPE;
  occurrence public.realtor_planner_occurrences%ROWTYPE; enabled BOOLEAN; final_status TEXT;
BEGIN
  SELECT * INTO job FROM public.workflow_jobs WHERE id=p_job_id FOR UPDATE;
  IF NOT FOUND OR job.workflow_key<>'realtor_reminder' OR job.trigger_kind<>'event'
    OR job.status<>'running' OR job.lease_token IS DISTINCT FROM p_lease_token
    OR job.lease_until IS NULL OR job.lease_until<=clock_timestamp() THEN
    RETURN QUERY SELECT FALSE,'stale'; RETURN;
  END IF;
  SELECT * INTO reminder FROM public.realtor_reminders
   WHERE id=(job.payload->>'reminderId')::UUID AND user_id=job.user_id
     AND workspace_id=(job.payload->>'workspaceId')::UUID FOR UPDATE;
  SELECT * INTO occurrence FROM public.realtor_planner_occurrences
   WHERE id=(job.payload->>'occurrenceId')::UUID AND user_id=job.user_id
     AND workspace_id=(job.payload->>'workspaceId')::UUID FOR UPDATE;
  SELECT reminders_enabled INTO enabled FROM public.realtor_preferences
   WHERE user_id=job.user_id AND workspace_id=(job.payload->>'workspaceId')::UUID;
  IF reminder.id IS NOT NULL AND occurrence.id IS NOT NULL AND COALESCE(enabled,false)
    AND reminder.status='scheduled' AND reminder.revision=(job.payload->>'reminderRevision')::INTEGER
    AND reminder.occurrence_revision=occurrence.revision
    AND occurrence.revision=(job.payload->>'occurrenceRevision')::INTEGER
    AND occurrence.status='pending' AND reminder.scheduled_at<=clock_timestamp()
    AND (reminder.snoozed_until IS NULL OR reminder.snoozed_until<=clock_timestamp()) THEN
    UPDATE public.realtor_reminders SET status='visible',revision=revision+1,updated_at=now() WHERE id=reminder.id;
    final_status:='visible';
  ELSE
    final_status:='stale_or_disabled';
  END IF;
  INSERT INTO public.workflow_results(job_id,workflow_key,result_type,result_id)
    VALUES(job.id,job.workflow_key,'realtor_reminder',COALESCE(reminder.id,(job.payload->>'reminderId')::UUID))
    ON CONFLICT(job_id) DO UPDATE SET result_type=EXCLUDED.result_type,result_id=EXCLUDED.result_id;
  UPDATE public.workflow_jobs SET status='completed',lease_until=NULL,lease_token=NULL,error=NULL,
    result_id=COALESCE(reminder.id,(job.payload->>'reminderId')::UUID),updated_at=now() WHERE id=job.id;
  RETURN QUERY SELECT TRUE,final_status;
END $$;

REVOKE ALL ON FUNCTION public.realtor_enqueue_reminder_job() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.realtor_commit_reminder_job(UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_commit_reminder_job(UUID,UUID) TO service_role;
REVOKE ALL ON FUNCTION public.realtor_update_reminder(UUID,UUID,UUID,INTEGER,UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_update_reminder(UUID,UUID,UUID,INTEGER,UUID,TEXT,TIMESTAMPTZ) TO service_role;
