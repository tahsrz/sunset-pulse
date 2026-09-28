BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(6);
CREATE TEMP TABLE realtor_reminder_lifecycle_assertions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  passed BOOLEAN NOT NULL,
  description TEXT NOT NULL
);
CREATE FUNCTION pg_temp.record_realtor_reminder_assertion(p_passed BOOLEAN, p_description TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO pg_temp.realtor_reminder_lifecycle_assertions(passed, description)
  VALUES (p_passed, p_description);
END;
$$;
DO $$
DECLARE actor UUID:=gen_random_uuid(); workspace UUID:=gen_random_uuid(); item UUID:=gen_random_uuid();
  occurrence UUID:=gen_random_uuid(); reminder UUID; before_jobs INTEGER;
BEGIN
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  INSERT INTO auth.users(id,email) VALUES(actor,'reminder-lifecycle@example.test');
  PERFORM public.platform_create_workspace_with_owner(actor,workspace,'personal','Reminder lifecycle');
  INSERT INTO public.realtor_preferences(user_id,workspace_id,reminders_enabled) VALUES(actor,workspace,false);
  INSERT INTO public.realtor_planner_items(id,user_id,workspace_id,kind,title,due_spec)
    VALUES(item,actor,workspace,'task','Reminder lifecycle',jsonb_build_object('anchorDate',CURRENT_DATE,
      'timeZone','America/Chicago','localTime','09:00','recurrence',jsonb_build_object('frequency','once'),
      'reminderOffsetsDays',jsonb_build_array(1)));
  INSERT INTO public.realtor_planner_occurrences(id,item_id,user_id,workspace_id,occurrence_key,original_date,effective_date,item_revision,title_snapshot,kind_snapshot)
    VALUES(occurrence,item,actor,workspace,'test',CURRENT_DATE,CURRENT_DATE,1,'Reminder lifecycle','task');
  INSERT INTO public.realtor_reminders(occurrence_id,user_id,workspace_id,occurrence_revision,offset_days,scheduled_at)
    VALUES(occurrence,actor,workspace,1,1,now()) RETURNING id INTO reminder;
  PERFORM pg_temp.record_realtor_reminder_assertion(NOT EXISTS(SELECT 1 FROM public.workflow_jobs WHERE user_id=actor AND workflow_key='realtor_reminder'),'opt-out creates no delivery job'::text);
  UPDATE public.realtor_preferences SET reminders_enabled=true WHERE user_id=actor;
  PERFORM pg_temp.record_realtor_reminder_assertion((SELECT count(*)=1 FROM public.workflow_jobs WHERE user_id=actor AND workflow_key='realtor_reminder'),'opt-in queues existing scheduled reminder'::text);
  PERFORM public.realtor_apply_occurrence_action(actor,workspace,occurrence,1,gen_random_uuid(),'reschedule',CURRENT_DATE+7,'11:00','{}');
  PERFORM pg_temp.record_realtor_reminder_assertion((SELECT status='superseded' FROM public.realtor_reminders WHERE id=reminder),'rescheduling retains superseded reminder evidence'::text);
  PERFORM pg_temp.record_realtor_reminder_assertion((SELECT count(*)=1 FROM public.realtor_reminders WHERE occurrence_id=occurrence AND occurrence_revision=2 AND status='scheduled'
    AND scheduled_at=(CURRENT_DATE+6+'11:00'::TIME) AT TIME ZONE 'America/Chicago'),'reschedule queues one reminder at the new local time'::text);
  PERFORM public.realtor_apply_occurrence_action(actor,workspace,occurrence,2,gen_random_uuid(),'complete',NULL,NULL,'{}');
  PERFORM public.realtor_apply_occurrence_action(actor,workspace,occurrence,3,gen_random_uuid(),'reopen',NULL,NULL,'{}');
  PERFORM pg_temp.record_realtor_reminder_assertion((SELECT count(*)=1 FROM public.realtor_reminders WHERE occurrence_id=occurrence AND occurrence_revision=4 AND status='scheduled'),'reopen restores reminder coverage for the current revision'::text);
  UPDATE public.realtor_reminders SET status='dismissed' WHERE occurrence_id=occurrence AND occurrence_revision=4;
  SELECT count(*) INTO before_jobs FROM public.workflow_jobs WHERE user_id=actor AND workflow_key='realtor_reminder';
  UPDATE public.realtor_preferences SET reminders_enabled=false WHERE user_id=actor;
  UPDATE public.realtor_preferences SET reminders_enabled=true WHERE user_id=actor;
  PERFORM pg_temp.record_realtor_reminder_assertion((SELECT count(*)=before_jobs FROM public.workflow_jobs WHERE user_id=actor AND workflow_key='realtor_reminder'),'re-enabling does not resurrect dismissed reminders'::text);
END $$;
SELECT ok(passed, description)
FROM pg_temp.realtor_reminder_lifecycle_assertions
ORDER BY id;
SELECT * FROM finish();
ROLLBACK;
