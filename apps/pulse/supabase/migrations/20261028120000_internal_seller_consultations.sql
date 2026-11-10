-- Internal consultation calendars. No calendar or working hours are enabled by
-- this migration. Existing scheduler resources and seller history are reused.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.seller_consultation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES public.site_config(agent_id) ON DELETE RESTRICT,
  site TEXT NOT NULL CHECK(length(site) BETWEEN 1 AND 180),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  resource_id UUID NOT NULL REFERENCES public.scheduling_users(id) ON DELETE RESTRICT,
  schedule_id UUID NOT NULL REFERENCES public.scheduling_schedules(id) ON DELETE RESTRICT,
  event_type_id UUID NOT NULL REFERENCES public.scheduling_event_types(id) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  time_zone TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes IN (15,30,45,60)),
  notice_minutes INTEGER NOT NULL CHECK(notice_minutes BETWEEN 0 AND 10080),
  horizon_days INTEGER NOT NULL CHECK(horizon_days BETWEEN 1 AND 60),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
  UNIQUE(agent_id,site)
);

-- One shared interval invariant, including legacy writes to a configured
-- consultation resource. Adjacent intervals are allowed; overlaps are not.
CREATE TABLE public.seller_consultation_claims (
  booking_id UUID PRIMARY KEY REFERENCES public.scheduling_bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.scheduling_users(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL CHECK(ends_at>starts_at),
  EXCLUDE USING gist(resource_id WITH =, tstzrange(starts_at,ends_at,'[)') WITH &&)
);
ALTER TABLE public.seller_consultation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_consultation_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_consultation_settings, public.seller_consultation_claims FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.seller_consultation_settings, public.seller_consultation_claims TO service_role;

CREATE FUNCTION public.seller_consultation_claim_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE resource UUID; mapped UUID;
BEGIN
  SELECT resource_id INTO mapped FROM public.seller_consultation_settings
    WHERE agent_id=NEW.agent_id AND site=NEW.site;
  IF mapped IS NOT NULL THEN
    IF NEW.user_id IS NOT NULL AND NEW.user_id<>mapped THEN
      RAISE EXCEPTION 'Booking resource does not match its calendar' USING ERRCODE='22023';
    END IF;
    NEW.user_id:=mapped;
  END IF;
  SELECT resource_id INTO resource FROM public.seller_consultation_settings WHERE resource_id=NEW.user_id LIMIT 1;
  IF resource IS NOT NULL AND NEW.status IN ('accepted','pending','awaiting_host') THEN
    INSERT INTO public.seller_consultation_claims(booking_id,resource_id,starts_at,ends_at)
      VALUES(NEW.id,resource,NEW.start_time,NEW.end_time)
      ON CONFLICT(booking_id) DO UPDATE SET resource_id=EXCLUDED.resource_id,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at;
  ELSE DELETE FROM public.seller_consultation_claims WHERE booking_id=NEW.id;
  END IF;
  RETURN NEW;
END $$;
-- AFTER is required for the claim's foreign key. Resource assignment happens
-- in the separate BEFORE trigger and cannot be skipped by a direct writer.
CREATE FUNCTION public.seller_consultation_assign_resource()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE mapped UUID;
BEGIN
  IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.seller_consultation_settings WHERE resource_id=OLD.user_id)
    AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Calendar resource is immutable' USING ERRCODE='22023'; END IF;
  IF TG_OP='UPDATE' AND OLD.metadata->>'sellerConsultationVersion'='1' AND (
    NEW.metadata->>'sellerConsultationVersion' IS DISTINCT FROM '1' OR NEW.metadata->>'requestSlotId' IS DISTINCT FROM OLD.metadata->>'requestSlotId'
    OR NEW.lead_id IS DISTINCT FROM OLD.lead_id OR NEW.funnel_id IS DISTINCT FROM OLD.funnel_id
    OR NEW.agent_id IS DISTINCT FROM OLD.agent_id OR NEW.site IS DISTINCT FROM OLD.site
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key OR NEW.appointment_type IS DISTINCT FROM OLD.appointment_type
    OR NEW.start_time IS DISTINCT FROM OLD.start_time OR NEW.end_time IS DISTINCT FROM OLD.end_time
    OR NEW.event_type_id IS DISTINCT FROM OLD.event_type_id OR NEW.status NOT IN ('accepted','cancelled')
    OR (OLD.status='cancelled' AND NEW.status<>'cancelled')) THEN
    RAISE EXCEPTION 'Cancel and create a new consultation to change its reservation' USING ERRCODE='22023';
  END IF;
  SELECT resource_id INTO mapped FROM public.seller_consultation_settings WHERE agent_id=NEW.agent_id AND site=NEW.site;
  IF mapped IS NOT NULL THEN
    IF NEW.user_id IS NOT NULL AND NEW.user_id<>mapped THEN RAISE EXCEPTION 'Booking resource mismatch' USING ERRCODE='22023'; END IF;
    NEW.user_id:=mapped;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER seller_consultation_resource BEFORE INSERT OR UPDATE ON public.scheduling_bookings
  FOR EACH ROW EXECUTE FUNCTION public.seller_consultation_assign_resource();
CREATE TRIGGER seller_consultation_claim AFTER INSERT OR UPDATE ON public.scheduling_bookings
  FOR EACH ROW EXECUTE FUNCTION public.seller_consultation_claim_booking();

CREATE FUNCTION public.seller_consultation_configure(p_actor_id UUID,p_agent_id TEXT,p_site TEXT,p_input JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE cfg public.seller_consultation_settings%ROWTYPE; actor_email TEXT; user_id UUID; schedule UUID; event_type UUID;
  zone TEXT:=p_input->>'timeZone'; duration INTEGER:=(p_input->>'durationMinutes')::INTEGER;
  notice INTEGER:=(p_input->>'noticeMinutes')::INTEGER; horizon INTEGER:=(p_input->>'horizonDays')::INTEGER;
  is_enabled BOOLEAN:=(p_input->>'enabled')::BOOLEAN; windows JSONB:=p_input->'windows'; item JSONB; prior public.realtor_mutation_receipts%ROWTYPE;
  request_id UUID:=(p_input->>'requestId')::UUID; hash TEXT:=encode(digest(p_input::TEXT||p_agent_id||p_site,'sha256'),'hex');
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required' USING ERRCODE='42501'; END IF;
  IF p_actor_id IS NULL OR request_id IS NULL OR p_agent_id IS NULL OR p_site IS NULL OR length(p_site) NOT BETWEEN 1 AND 180
    OR jsonb_typeof(p_input)<>'object' OR octet_length(p_input::TEXT)>8192 OR duration IS NULL OR duration NOT IN (15,30,45,60)
    OR notice IS NULL OR notice NOT BETWEEN 0 AND 10080 OR horizon IS NULL OR horizon NOT BETWEEN 1 AND 60 OR is_enabled IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=zone)
    OR jsonb_typeof(windows) IS DISTINCT FROM 'array' OR jsonb_array_length(windows)>21
    OR (is_enabled AND (jsonb_array_length(windows)=0 OR p_input->>'internalCalendarAcknowledged' IS DISTINCT FROM 'true')) THEN
    RAISE EXCEPTION 'Invalid consultation calendar settings' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.site_config WHERE agent_id=p_agent_id AND owner_id=p_actor_id AND status='active'
    AND (p_site=agent_id OR p_site=subdomain OR agent_id=p_site||'-site') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Calendar unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.realtor_preferences pref WHERE pref.user_id=p_actor_id
    AND public.realtor_personal_access(p_actor_id,pref.workspace_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Personal planner setup required' USING ERRCODE='42501'; END IF;
  SELECT email INTO actor_email FROM auth.users WHERE id=p_actor_id AND email_confirmed_at IS NOT NULL;
  IF actor_email IS NULL THEN RAISE EXCEPTION 'Verified calendar owner required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('consultation-config:'||p_actor_id::TEXT,0));
  SELECT * INTO prior FROM public.realtor_mutation_receipts WHERE actor_id=p_actor_id AND request_key=request_id;
  IF FOUND THEN
    IF prior.operation<>'consultation_settings' OR prior.input_hash<>hash THEN RAISE EXCEPTION 'Changed settings retry' USING ERRCODE='PT409'; END IF;
    RETURN prior.response;
  END IF;
  SELECT * INTO cfg FROM public.seller_consultation_settings WHERE agent_id=p_agent_id AND site=p_site FOR UPDATE;
  IF FOUND AND (cfg.owner_id<>p_actor_id OR cfg.revision IS DISTINCT FROM (p_input->>'expectedRevision')::INTEGER) THEN
    RAISE EXCEPTION 'Calendar changed' USING ERRCODE='PT409';
  ELSIF NOT FOUND AND p_input->>'expectedRevision' IS NOT NULL THEN RAISE EXCEPTION 'Calendar changed' USING ERRCODE='PT409';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(windows) LOOP
    IF jsonb_typeof(item)<>'object' OR COALESCE((item->>'weekday')::INTEGER,-1) NOT BETWEEN 0 AND 6
      OR COALESCE(item->>'start','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR COALESCE(item->>'end','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR (item->>'end')::TIME<=(item->>'start')::TIME
      OR extract(epoch FROM ((item->>'end')::TIME-(item->>'start')::TIME))<duration*60 THEN
      RAISE EXCEPTION 'Invalid consultation availability' USING ERRCODE='22023';
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(windows) WITH ORDINALITY a(w,i),jsonb_array_elements(windows) WITH ORDINALITY b(w,i)
    WHERE a.i<b.i AND a.w->>'weekday'=b.w->>'weekday'
      AND (a.w->>'start')::TIME<(b.w->>'end')::TIME AND (b.w->>'start')::TIME<(a.w->>'end')::TIME) THEN
    RAISE EXCEPTION 'Availability windows overlap' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.scheduling_users(auth_user_id,email,time_zone) VALUES(p_actor_id,actor_email,zone)
    ON CONFLICT(auth_user_id) DO UPDATE SET time_zone=EXCLUDED.time_zone RETURNING id INTO user_id;
  IF cfg.id IS NULL THEN
    cfg.id:=gen_random_uuid();
    INSERT INTO public.scheduling_schedules(user_id,name,time_zone) VALUES(user_id,'Seller Consultations',zone) RETURNING id INTO schedule;
    INSERT INTO public.scheduling_event_types(owner_id,schedule_id,title,slug,length_minutes,time_zone)
      VALUES(user_id,schedule,'Seller Consultation','seller-consultation-'||cfg.id::TEXT,duration,zone) RETURNING id INTO event_type;
    INSERT INTO public.seller_consultation_settings(id,agent_id,site,owner_id,resource_id,schedule_id,event_type_id,enabled,time_zone,duration_minutes,notice_minutes,horizon_days)
      VALUES(cfg.id,p_agent_id,p_site,p_actor_id,user_id,schedule,event_type,is_enabled,zone,duration,notice,horizon) RETURNING * INTO cfg;
  ELSE
    UPDATE public.seller_consultation_settings SET enabled=is_enabled,time_zone=zone,duration_minutes=duration,notice_minutes=notice,horizon_days=horizon,revision=revision+1
      WHERE id=cfg.id RETURNING * INTO cfg;
    UPDATE public.scheduling_schedules SET time_zone=zone WHERE id=cfg.schedule_id;
    UPDATE public.scheduling_event_types SET time_zone=zone,length_minutes=duration WHERE id=cfg.event_type_id;
  END IF;
  DELETE FROM public.scheduling_availability WHERE schedule_id=cfg.schedule_id;
  FOR item IN SELECT value FROM jsonb_array_elements(windows) LOOP
    INSERT INTO public.scheduling_availability(user_id,event_type_id,schedule_id,days,start_time,end_time)
      VALUES(cfg.resource_id,cfg.event_type_id,cfg.schedule_id,ARRAY[(item->>'weekday')::INTEGER],(item->>'start')::TIME,(item->>'end')::TIME);
  END LOOP;
  -- Adopt existing bookings only inside this calendar's scope. Overlapping
  -- legacy records make configuration fail and roll back for owner review.
  UPDATE public.scheduling_bookings SET user_id=cfg.resource_id WHERE agent_id=p_agent_id AND site=p_site;
  INSERT INTO public.seller_consultation_claims(booking_id,resource_id,starts_at,ends_at)
    SELECT b.id,cfg.resource_id,b.start_time,b.end_time FROM public.scheduling_bookings b
    WHERE b.user_id=cfg.resource_id AND b.status IN ('accepted','pending','awaiting_host')
    ON CONFLICT(booking_id) DO UPDATE SET starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at;
  INSERT INTO public.realtor_mutation_receipts(actor_id,request_key,operation,input_hash,resource_id,resource_revision,response)
    VALUES(p_actor_id,request_id,'consultation_settings',hash,cfg.id,cfg.revision,jsonb_build_object('revision',cfg.revision));
  RETURN jsonb_build_object('revision',cfg.revision);
END $$;

CREATE FUNCTION public.seller_consultation_require_identity(p_identity JSONB)
RETURNS public.seller_consultation_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cfg public.seller_consultation_settings%ROWTYPE; lead public.agent_site_leads%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO cfg FROM public.seller_consultation_settings WHERE agent_id=p_identity->>'agentId' AND site=p_identity->>'site' FOR SHARE;
  IF cfg.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.site_config WHERE agent_id=cfg.agent_id AND owner_id=cfg.owner_id AND status='active')
    OR NOT EXISTS(SELECT 1 FROM public.scheduling_users WHERE id=cfg.resource_id AND auth_user_id=cfg.owner_id) THEN
    RAISE EXCEPTION 'Consultation calendar unavailable' USING ERRCODE='P0002';
  END IF;
  lead:=public.seller_service_require_owner(cfg.owner_id,(p_identity->>'leadId')::UUID,false);
  IF lead.agent_id IS DISTINCT FROM cfg.agent_id OR lead.site IS DISTINCT FROM cfg.site OR lead.funnel_id IS DISTINCT FROM (p_identity->>'funnelId')::UUID
    OR lead.status IN ('closed','archived') OR lead.metadata#>>'{sellerPlan,requestedContact,granted}' IS DISTINCT FROM 'true'
    OR COALESCE(lead.metadata#>'{sellerPlan,requestedContact}','{}'::jsonb) ? 'revokedAt'
    OR nullif(btrim(lead.email),'') IS NULL THEN RAISE EXCEPTION 'Saved request unavailable' USING ERRCODE='42501'; END IF;
  RETURN cfg;
END $$;

-- The same generator revalidates a selected slot inside the reservation
-- transaction. Nonexistent DST wall times and slots spanning a clock change
-- are omitted; repeated wall times use PostgreSQL's one canonical instant.
CREATE FUNCTION public.seller_consultation_slots_internal(p_setting_id UUID,p_from TIMESTAMPTZ,p_to TIMESTAMPTZ,p_now TIMESTAMPTZ)
RETURNS TABLE(slot_id TEXT,starts_at TIMESTAMPTZ,ends_at TIMESTAMPTZ,time_zone TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH cfg AS (SELECT * FROM public.seller_consultation_settings WHERE id=p_setting_id AND enabled),
  walls AS (
    SELECT DISTINCT c.id,c.revision,c.resource_id,c.time_zone,c.duration_minutes,c.notice_minutes,c.horizon_days,wall
    FROM cfg c
    CROSS JOIN LATERAL generate_series((p_from AT TIME ZONE c.time_zone)::DATE-1,(p_to AT TIME ZONE c.time_zone)::DATE+1,INTERVAL '1 day') day
    JOIN public.scheduling_availability a ON a.schedule_id=c.schedule_id AND a.date IS NULL
      AND extract(dow FROM day)::INTEGER=ANY(a.days)
    CROSS JOIN LATERAL generate_series(day::DATE+a.start_time,day::DATE+a.end_time-make_interval(mins=>c.duration_minutes),make_interval(mins=>c.duration_minutes)) wall
  ), instants AS (
    SELECT *,wall AT TIME ZONE time_zone AS start_at,(wall+make_interval(mins=>duration_minutes)) AT TIME ZONE time_zone AS end_at FROM walls
  )
  SELECT id::TEXT||':'||revision::TEXT||':'||extract(epoch FROM start_at)::BIGINT::TEXT,start_at,end_at,time_zone FROM instants i
  WHERE start_at>=p_from AND end_at<=p_to AND start_at>=p_now+make_interval(mins=>notice_minutes)
    AND start_at<=p_now+make_interval(days=>horizon_days)
    AND start_at AT TIME ZONE time_zone=wall
    AND end_at AT TIME ZONE time_zone=wall+make_interval(mins=>duration_minutes)
    AND end_at-start_at=make_interval(mins=>duration_minutes)
    AND NOT EXISTS(SELECT 1 FROM public.seller_consultation_claims claim WHERE claim.resource_id=i.resource_id AND claim.starts_at<i.end_at AND claim.ends_at>i.start_at)
  ORDER BY start_at LIMIT 500;
$$;

CREATE FUNCTION public.seller_consultation_availability(p_identity JSONB,p_from TIMESTAMPTZ,p_to TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cfg public.seller_consultation_settings%ROWTYPE; slots JSONB;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<=p_from OR p_to-p_from>INTERVAL '14 days' THEN
    RAISE EXCEPTION 'Invalid availability window' USING ERRCODE='22023'; END IF;
  cfg:=public.seller_consultation_require_identity(p_identity);
  IF NOT cfg.enabled THEN RETURN jsonb_build_object('status','unavailable','reason','not_configured'); END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',slot_id,'startsAt',starts_at,'endsAt',ends_at,'timeZone',time_zone) ORDER BY starts_at),'[]') INTO slots
    FROM public.seller_consultation_slots_internal(cfg.id,p_from,p_to,clock_timestamp());
  RETURN jsonb_build_object('status','available','slots',slots);
EXCEPTION WHEN SQLSTATE 'P0002' THEN RETURN jsonb_build_object('status','unavailable','reason','not_configured');
END $$;

CREATE FUNCTION public.seller_consultation_reserve(p_identity JSONB,p_slot_id TEXT,p_request_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE cfg public.seller_consultation_settings%ROWTYPE; booking public.scheduling_bookings%ROWTYPE; lead public.agent_site_leads%ROWTYPE;
  target_start TIMESTAMPTZ; target_end TIMESTAMPTZ; key TEXT; case_key UUID; case_revision INTEGER; existing_id UUID; slot RECORD;
  receipt JSONB; workspace UUID; local_date DATE; local_time TEXT;
BEGIN
  IF p_request_id IS NULL OR p_slot_id IS NULL OR length(p_slot_id)>200 OR p_slot_id!~'^[0-9a-f-]{36}:[0-9]+:[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid reservation request' USING ERRCODE='22023'; END IF;
  cfg:=public.seller_consultation_require_identity(p_identity);
  PERFORM pg_advisory_xact_lock(hashtextextended('consultation-resource:'||cfg.resource_id::TEXT,0));
  key:='seller-consultation:'||(p_identity->>'leadId')||':'||p_request_id::TEXT;
  SELECT * INTO booking FROM public.scheduling_bookings WHERE idempotency_key=key FOR UPDATE;
  IF FOUND THEN
    -- Recheck consent after waiting for a reservation, following the bridge's
    -- booking-before-lead lock order even on a lost-response replay.
    PERFORM public.seller_service_require_owner(cfg.owner_id,(p_identity->>'leadId')::UUID,true);
    cfg:=public.seller_consultation_require_identity(p_identity);
    IF booking.lead_id IS DISTINCT FROM (p_identity->>'leadId')::UUID OR booking.funnel_id IS DISTINCT FROM (p_identity->>'funnelId')::UUID
      OR booking.agent_id IS DISTINCT FROM cfg.agent_id OR booking.site IS DISTINCT FROM cfg.site OR booking.metadata->>'requestSlotId' IS DISTINCT FROM p_slot_id THEN
      RETURN jsonb_build_object('status','conflict'); END IF;
    IF booking.status='cancelled' THEN RETURN jsonb_build_object('status','cancelled'); END IF;
    IF booking.status<>'accepted' THEN RETURN jsonb_build_object('status','conflict'); END IF;
    RETURN jsonb_build_object('status','confirmed','bookingId',booking.id,'startsAt',booking.start_time,'endsAt',booking.end_time,'timeZone',cfg.time_zone);
  END IF;
  -- Lock active bookings before the lead, matching the existing seller bridge.
  SELECT id INTO existing_id FROM public.scheduling_bookings WHERE lead_id=(p_identity->>'leadId')::UUID
    AND appointment_type='seller_consultation' AND status IN ('accepted','pending','awaiting_host') AND end_time>clock_timestamp() LIMIT 1 FOR UPDATE;
  IF existing_id IS NOT NULL THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF NOT cfg.enabled OR split_part(p_slot_id,':',1)<>cfg.id::TEXT OR split_part(p_slot_id,':',2)<>cfg.revision::TEXT THEN
    RETURN jsonb_build_object('status','conflict'); END IF;
  target_start:=to_timestamp(split_part(p_slot_id,':',3)::BIGINT);
  target_end:=target_start+make_interval(mins=>cfg.duration_minutes);
  SELECT * INTO slot FROM public.seller_consultation_slots_internal(cfg.id,target_start,target_end,clock_timestamp()) WHERE slot_id=p_slot_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','conflict'); END IF;
  lead:=public.seller_service_require_owner(cfg.owner_id,(p_identity->>'leadId')::UUID,true);
  cfg:=public.seller_consultation_require_identity(p_identity);
  INSERT INTO public.scheduling_bookings(uid,idempotency_key,user_id,event_type_id,title,start_time,end_time,status,creation_source,
    lead_id,funnel_id,agent_id,site,appointment_type,metadata)
    VALUES(gen_random_uuid()::TEXT,key,cfg.resource_id,cfg.event_type_id,'Seller Consultation',target_start,target_end,'accepted','webapp',
      lead.id,lead.funnel_id,cfg.agent_id,cfg.site,'seller_consultation',jsonb_build_object('sellerConsultationVersion',1,'requestSlotId',p_slot_id)) RETURNING * INTO booking;
  INSERT INTO public.scheduling_attendees(booking_id,email,name,time_zone)
    VALUES(booking.id,lower(lead.email),lead.name,cfg.time_zone);
  INSERT INTO public.seller_cases(lead_id,owner_id) VALUES(lead.id,cfg.owner_id) ON CONFLICT DO NOTHING;
  SELECT revision INTO case_revision FROM public.seller_cases WHERE lead_id=lead.id AND owner_id=cfg.owner_id FOR UPDATE;
  case_key:=substr(encode(digest('seller-consultation-case:'||lead.id::TEXT||':'||p_request_id::TEXT,'sha256'),'hex'),1,32)::UUID;
  receipt:=public.seller_case_action(cfg.owner_id,jsonb_build_object('leadId',lead.id,'expectedRevision',case_revision,'requestKey',case_key,'action','link_booking','bookingId',booking.id));
  -- The existing planner and reminder worker own reminders. This appointment
  -- and its source event are committed in the same reservation transaction.
  SELECT workspace_id INTO workspace FROM public.realtor_preferences WHERE user_id=cfg.owner_id;
  SELECT revision INTO lead.revision FROM public.agent_site_leads WHERE id=lead.id;
  local_date:=(target_start AT TIME ZONE cfg.time_zone)::DATE;
  local_time:=to_char(target_start AT TIME ZONE cfg.time_zone,'HH24:MI');
  PERFORM public.realtor_save_planner_item(cfg.owner_id,workspace,NULL,NULL,
    substr(encode(digest('consultation-planner:'||booking.id::TEXT,'sha256'),'hex'),1,32)::UUID,
    jsonb_build_object('kind','appointment','title','Seller Consultation','notes','','expectedAmountCents',NULL,'property',NULL,'sourceSprintTaskId',NULL,
      'sellerLead',jsonb_build_object('leadId',lead.id,'expectedLeadRevision',lead.revision,'actionKey','consultation:'||(receipt#>>'{details,consultationEventId}')),
      'due',jsonb_build_object('anchorDate',local_date,'localTime',local_time,'timeZone',cfg.time_zone,
        'recurrence',jsonb_build_object('frequency','once'),'endsOn',NULL,'reminderOffsetsDays','[0]'::JSONB)),
    jsonb_build_array(jsonb_build_object('occurrenceKeyDate',local_date,'effectiveDate',local_date,
      'reminders',jsonb_build_array(jsonb_build_object('offsetDays',0,'scheduledAt',target_start)))));
  RETURN jsonb_build_object('status','confirmed','bookingId',booking.id,'startsAt',booking.start_time,'endsAt',booking.end_time,'timeZone',cfg.time_zone);
EXCEPTION WHEN exclusion_violation OR unique_violation THEN RETURN jsonb_build_object('status','conflict');
END $$;

CREATE FUNCTION public.seller_consultation_cancel(p_actor_id UUID,p_booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE booking public.scheduling_bookings%ROWTYPE; cfg public.seller_consultation_settings%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access required' USING ERRCODE='42501'; END IF;
  SELECT c.* INTO cfg FROM public.seller_consultation_settings c JOIN public.scheduling_bookings b ON b.user_id=c.resource_id WHERE b.id=p_booking_id AND c.owner_id=p_actor_id LIMIT 1;
  IF cfg.id IS NULL THEN RAISE EXCEPTION 'Consultation unavailable' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('consultation-resource:'||cfg.resource_id::TEXT,0));
  SELECT * INTO booking FROM public.scheduling_bookings WHERE id=p_booking_id FOR UPDATE;
  PERFORM public.seller_service_require_owner(p_actor_id,booking.lead_id,true);
  IF booking.appointment_type<>'seller_consultation' OR booking.metadata->>'sellerConsultationVersion' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Managed consultation required' USING ERRCODE='42501'; END IF;
  IF booking.status<>'cancelled' THEN UPDATE public.scheduling_bookings SET status='cancelled',cancellation_reason='Cancelled by calendar owner' WHERE id=p_booking_id; END IF;
  RETURN jsonb_build_object('status','cancelled');
END $$;

REVOKE ALL ON FUNCTION public.seller_consultation_claim_booking(),public.seller_consultation_assign_resource(),
  public.seller_consultation_configure(UUID,TEXT,TEXT,JSONB),public.seller_consultation_require_identity(JSONB),
  public.seller_consultation_slots_internal(UUID,TIMESTAMPTZ,TIMESTAMPTZ,TIMESTAMPTZ),
  public.seller_consultation_availability(JSONB,TIMESTAMPTZ,TIMESTAMPTZ),public.seller_consultation_reserve(JSONB,TEXT,UUID),
  public.seller_consultation_cancel(UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_consultation_configure(UUID,TEXT,TEXT,JSONB),
  public.seller_consultation_availability(JSONB,TIMESTAMPTZ,TIMESTAMPTZ),public.seller_consultation_reserve(JSONB,TEXT,UUID),
  public.seller_consultation_cancel(UUID,UUID) TO service_role;
