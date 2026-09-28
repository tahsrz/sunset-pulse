-- Preserve reminder coverage across owner edits without resurrecting dismissed
-- reminders or sending external messages.
-- Match owner action lock ordering: occurrence before reminder.
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
  SELECT * INTO occurrence FROM public.realtor_planner_occurrences
   WHERE id=(job.payload->>'occurrenceId')::UUID AND user_id=job.user_id
     AND workspace_id=(job.payload->>'workspaceId')::UUID FOR UPDATE;
  SELECT * INTO reminder FROM public.realtor_reminders
   WHERE id=(job.payload->>'reminderId')::UUID AND user_id=job.user_id
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
CREATE FUNCTION public.realtor_refresh_occurrence_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE spec JSONB; reminder_offset INTEGER;
BEGIN
  IF NEW.status <> 'pending' OR NEW.revision = OLD.revision THEN RETURN NEW; END IF;
  SELECT due_spec INTO spec FROM public.realtor_planner_items
    WHERE id=NEW.item_id AND user_id=NEW.user_id AND workspace_id=NEW.workspace_id AND status='active';
  IF NOT FOUND THEN RETURN NEW; END IF;
  UPDATE public.realtor_reminders SET status='superseded',revision=revision+1,updated_at=now()
    WHERE occurrence_id=NEW.id AND occurrence_revision<>NEW.revision AND status IN ('scheduled','visible');
  FOR reminder_offset IN SELECT value::INTEGER FROM jsonb_array_elements_text(COALESCE(spec->'reminderOffsetsDays','[]'::JSONB)) LOOP
    INSERT INTO public.realtor_reminders(occurrence_id,user_id,workspace_id,occurrence_revision,offset_days,scheduled_at)
    VALUES(NEW.id,NEW.user_id,NEW.workspace_id,NEW.revision,reminder_offset,
      (NEW.effective_date-reminder_offset+COALESCE(NEW.effective_time,'09:00'::TIME))
        AT TIME ZONE COALESCE(NULLIF(spec->>'timeZone',''),'America/Chicago'))
    ON CONFLICT ON CONSTRAINT realtor_reminders_occurrence_revision_offset_unique DO NOTHING;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_occurrence_reminder_refresh AFTER UPDATE ON public.realtor_planner_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.realtor_refresh_occurrence_reminders();

CREATE FUNCTION public.realtor_reenable_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT NEW.reminders_enabled OR OLD.reminders_enabled THEN RETURN NEW; END IF;
  -- A new reminder revision gets a distinct durable event identity. Older
  -- queued/terminal events cannot consume or replay the new delivery.
  UPDATE public.realtor_reminders r SET revision=r.revision+1,updated_at=now()
    FROM public.realtor_planner_occurrences o
    WHERE r.user_id=NEW.user_id AND r.workspace_id=NEW.workspace_id AND r.status='scheduled'
      AND o.id=r.occurrence_id AND o.user_id=r.user_id AND o.workspace_id=r.workspace_id
      AND o.status='pending' AND o.revision=r.occurrence_revision;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_preferences_reminder_resume AFTER UPDATE OF reminders_enabled ON public.realtor_preferences
  FOR EACH ROW EXECUTE FUNCTION public.realtor_reenable_reminders();

CREATE FUNCTION public.realtor_preserve_task_provenance()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.source_sprint_task_id IS NOT NULL
    AND (NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.kind IS DISTINCT FROM OLD.kind) THEN
    RAISE EXCEPTION 'A linked sprint task must retain its property and task kind' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER realtor_planner_preserve_task_provenance BEFORE UPDATE ON public.realtor_planner_items
  FOR EACH ROW EXECUTE FUNCTION public.realtor_preserve_task_provenance();

REVOKE ALL ON FUNCTION public.realtor_refresh_occurrence_reminders(),public.realtor_reenable_reminders(),
  public.realtor_preserve_task_provenance() FROM PUBLIC,anon,authenticated,service_role;
