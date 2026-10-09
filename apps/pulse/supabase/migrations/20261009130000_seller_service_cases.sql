-- Connected seller service. Browser roles have no direct table access.
CREATE TABLE public.seller_cases (
  lead_id UUID PRIMARY KEY REFERENCES public.agent_site_leads(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  property_id UUID REFERENCES public.property_shortlist_entries(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 4000),
  documents JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(documents)='array' AND jsonb_array_length(documents)<=20),
  checklist JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(checklist)='array' AND jsonb_array_length(checklist)<=30),
  publication JSONB CHECK (jsonb_typeof(publication)='object' AND octet_length(publication::TEXT)<=32768),
  published_at TIMESTAMPTZ,
  sharing_enabled BOOLEAN NOT NULL DEFAULT false,
  shared_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID NOT NULL REFERENCES public.seller_cases(lead_id),
  actor_id UUID NOT NULL REFERENCES auth.users(id), request_key UUID NOT NULL,
  input_hash TEXT NOT NULL, kind TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(), details JSONB NOT NULL,
  result JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(actor_id,request_key)
);
CREATE INDEX seller_case_events_history ON public.seller_case_events(lead_id,created_at DESC,id DESC);
CREATE TRIGGER seller_case_events_immutable BEFORE UPDATE OR DELETE ON public.seller_case_events
  FOR EACH ROW EXECUTE FUNCTION public.seller_lead_event_immutable();
CREATE TABLE public.seller_case_booking_links (
  booking_id UUID PRIMARY KEY REFERENCES public.scheduling_bookings(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES public.seller_cases(lead_id),
  consultation_event_id UUID REFERENCES public.seller_lead_events(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID NOT NULL REFERENCES public.seller_cases(lead_id),
  owner_id UUID NOT NULL REFERENCES auth.users(id), direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')),
  subject TEXT NOT NULL CHECK(length(subject) BETWEEN 1 AND 200), body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 8000),
  recipient TEXT, reply_to TEXT, from_address TEXT,
  status TEXT NOT NULL CHECK(status IN ('recorded','queued','sending','accepted','delivered','bounced','failed','unknown','cancelled')),
  provider_id TEXT UNIQUE, job_id UUID REFERENCES public.workflow_jobs(id),
  occurred_at TIMESTAMPTZ NOT NULL, attempt_started_at TIMESTAMPTZ, accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX seller_case_messages_history ON public.seller_case_messages(lead_id,created_at DESC,id DESC);
CREATE UNIQUE INDEX seller_case_one_pending_email ON public.seller_case_messages(lead_id)
  WHERE status IN ('queued','sending','unknown');

DO $$ DECLARE name TEXT; BEGIN
  FOREACH name IN ARRAY ARRAY['seller_cases','seller_case_events','seller_case_booking_links','seller_case_messages'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',name);
    EXECUTE format('GRANT SELECT ON public.%I TO service_role',name);
  END LOOP;
END $$;

CREATE FUNCTION public.seller_service_require_owner(p_actor_id UUID,p_lead_id UUID,p_lock BOOLEAN DEFAULT false)
RETURNS public.agent_site_leads LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE lead public.agent_site_leads%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.site_config site WHERE site.agent_id=(SELECT l.agent_id FROM public.agent_site_leads l WHERE l.id=p_lead_id)
    AND site.owner_id=p_actor_id AND site.status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller request unavailable' USING ERRCODE='P0002'; END IF;
  IF p_lock THEN SELECT * INTO lead FROM public.agent_site_leads WHERE id=p_lead_id AND source='seller_plan' FOR UPDATE;
  ELSE SELECT * INTO lead FROM public.agent_site_leads WHERE id=p_lead_id AND source='seller_plan'; END IF;
  IF NOT FOUND OR EXISTS(SELECT 1 FROM public.seller_cases c WHERE c.lead_id=p_lead_id AND c.owner_id<>p_actor_id) THEN
    RAISE EXCEPTION 'Seller request unavailable' USING ERRCODE='P0002';
  END IF;
  RETURN lead;
END $$;

CREATE FUNCTION public.seller_service_contact_allowed(p_lead public.agent_site_leads)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT COALESCE(p_lead.status NOT IN ('closed','archived') AND nullif(btrim(p_lead.email),'') IS NOT NULL
    AND ((p_lead.metadata#>>'{sellerPlan,requestedContact,granted}'='true'
      AND NOT (COALESCE(p_lead.metadata#>'{sellerPlan,requestedContact}','{}'::jsonb) ? 'revokedAt'))
      OR p_lead.metadata#>>'{sellerPlan,marketingOptIn,granted}'='true')
    AND ((p_lead.contact_attempted_at IS NULL AND p_lead.metadata#>>'{sellerPlan,requestedContact,granted}'='true')
      OR p_lead.metadata#>>'{sellerPlan,marketingOptIn,granted}'='true'
      OR p_lead.responded_at>p_lead.contact_attempted_at),false);
$$;

CREATE FUNCTION public.seller_service_active_milestone(p_lead_id UUID,p_milestone TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.seller_case_events e WHERE e.lead_id=p_lead_id AND e.kind='milestone' AND e.details->>'milestone'=p_milestone
    AND NOT EXISTS(SELECT 1 FROM public.seller_case_events r WHERE r.lead_id=e.lead_id AND r.kind='retract_milestone' AND r.details->>'milestoneEventId'=e.id::TEXT));
$$;

CREATE FUNCTION public.seller_case_read(p_actor_id UUID,p_lead_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE lead public.agent_site_leads%ROWTYPE; result JSONB;
BEGIN
  lead:=public.seller_service_require_owner(p_actor_id,p_lead_id);
  SELECT jsonb_build_object('case',(SELECT to_jsonb(c) FROM public.seller_cases c WHERE c.lead_id=p_lead_id),
    'lead',jsonb_build_object('id',lead.id,'name',lead.name,'email',lead.email,'revision',lead.revision,'status',lead.status),
    'contactAllowed',public.seller_service_contact_allowed(lead),
    'milestones',COALESCE((SELECT jsonb_agg(milestone ORDER BY milestone) FROM (SELECT DISTINCT e.details->>'milestone' AS milestone FROM public.seller_case_events e WHERE e.lead_id=p_lead_id AND e.kind='milestone' AND public.seller_service_active_milestone(p_lead_id,e.details->>'milestone')) recorded),'[]'),
    'milestoneRecords',COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId',e.id,'milestone',e.details->>'milestone','evidence',e.details->>'evidence','occurredOn',e.details->>'occurredOn') ORDER BY e.created_at)
      FROM public.seller_case_events e WHERE e.lead_id=p_lead_id AND e.kind='milestone' AND NOT EXISTS(SELECT 1 FROM public.seller_case_events r WHERE r.lead_id=e.lead_id AND r.kind='retract_milestone' AND r.details->>'milestoneEventId'=e.id::TEXT)),'[]'),
    'events',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'occurred_at',e.occurred_at,'details',e.details) ORDER BY e.created_at DESC,e.id DESC)
      FROM (SELECT * FROM public.seller_case_events WHERE lead_id=p_lead_id ORDER BY created_at DESC,id DESC LIMIT 100) e),'[]'),
    'messages',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'direction',m.direction,'subject',m.subject,'body',m.body,'status',m.status,'occurred_at',m.occurred_at,'provider_id',m.provider_id) ORDER BY m.created_at DESC,m.id DESC)
      FROM (SELECT * FROM public.seller_case_messages WHERE lead_id=p_lead_id ORDER BY created_at DESC,id DESC LIMIT 100) m),'[]'),
    'hasMoreEvents',(SELECT count(*)>100 FROM public.seller_case_events WHERE lead_id=p_lead_id),
    'hasMoreMessages',(SELECT count(*)>100 FROM public.seller_case_messages WHERE lead_id=p_lead_id),
    'bookings',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'start_time',b.start_time,'end_time',b.end_time,'status',b.status,'linked',EXISTS(SELECT 1 FROM public.seller_case_booking_links link WHERE link.booking_id=b.id)))
      FROM (SELECT * FROM public.scheduling_bookings WHERE lead_id=p_lead_id AND agent_id=lead.agent_id AND site=lead.site AND appointment_type='seller_consultation' ORDER BY start_time DESC,id DESC LIMIT 50) b),'[]'),
    'timeZone',COALESCE((SELECT time_zone FROM public.realtor_preferences WHERE user_id=p_actor_id),'America/Chicago')) INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.seller_case_action(p_actor_id UUID,p_input JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE lead public.agent_site_leads%ROWTYPE; saved public.seller_cases%ROWTYPE;
  prior public.seller_case_events%ROWTYPE; target public.seller_case_events%ROWTYPE; booking public.scheduling_bookings%ROWTYPE;
  v_lead_id UUID:=(p_input->>'leadId')::UUID; v_request_key UUID:=(p_input->>'requestKey')::UUID;
  action TEXT:=p_input->>'action'; hash TEXT:=encode(digest(p_input::TEXT,'sha256'),'hex');
  details JSONB:='{}'; result JSONB; receipt JSONB; message_id UUID; v_job_id UUID; owner_email TEXT;
BEGIN
  IF p_actor_id IS NULL OR v_lead_id IS NULL OR v_request_key IS NULL OR jsonb_typeof(p_input)<>'object'
    OR octet_length(p_input::TEXT)>32768 OR action IS NULL OR action NOT IN ('save_case','milestone','retract_milestone','link_booking','publish_progress','share_progress','record_message','send_email') THEN
    RAISE EXCEPTION 'Invalid seller service action' USING ERRCODE='22023';
  END IF;
  -- Booking mutations and the bridge use the same booking -> site -> lead order.
  IF action='link_booking' THEN SELECT * INTO booking FROM public.scheduling_bookings WHERE id=(p_input->>'bookingId')::UUID FOR UPDATE; END IF;
  lead:=public.seller_service_require_owner(p_actor_id,v_lead_id,true);
  INSERT INTO public.seller_cases(lead_id,owner_id) VALUES(v_lead_id,p_actor_id) ON CONFLICT DO NOTHING;
  SELECT * INTO saved FROM public.seller_cases c WHERE c.lead_id=v_lead_id AND c.owner_id=p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Case unavailable' USING ERRCODE='P0002'; END IF;
  SELECT * INTO prior FROM public.seller_case_events e WHERE e.actor_id=p_actor_id AND e.request_key=v_request_key;
  IF FOUND THEN
    IF prior.input_hash<>hash OR prior.lead_id<>v_lead_id THEN RAISE EXCEPTION 'Changed retry payload' USING ERRCODE='PT409'; END IF;
    RETURN prior.result||jsonb_build_object('replayed',true);
  END IF;
  IF saved.revision IS DISTINCT FROM (p_input->>'expectedRevision')::INTEGER THEN RAISE EXCEPTION 'Case changed' USING ERRCODE='PT409'; END IF;
  IF action='save_case' THEN
    IF nullif(p_input->>'propertyId','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.property_shortlist_entries p WHERE p.id=(p_input->>'propertyId')::UUID AND p.owner_id=p_actor_id AND p.status='active') THEN
      RAISE EXCEPTION 'Property unavailable' USING ERRCODE='42501'; END IF;
    UPDATE public.seller_cases c SET property_id=(p_input->>'propertyId')::UUID,notes=p_input->>'notes',documents=p_input->'documents',checklist=p_input->'checklist' WHERE c.lead_id=v_lead_id;
    details:=jsonb_build_object('propertyId',p_input->'propertyId');
  ELSIF action='milestone' THEN
    IF public.seller_service_active_milestone(v_lead_id,p_input->>'milestone') THEN RAISE EXCEPTION 'Milestone already recorded; retract incorrect evidence first' USING ERRCODE='PT409'; END IF;
    IF p_input->>'milestone' IS NULL OR p_input->>'milestone' NOT IN ('consultation_held','listing_agreement_verified','preparing','published','showing','offer_received','under_contract','closed')
      OR COALESCE(length(btrim(p_input->>'evidence')),0) NOT BETWEEN 1 AND 1000 OR p_input->>'occurredOn' IS NULL
      OR (p_input->>'occurredOn')::DATE> (now() AT TIME ZONE COALESCE((SELECT time_zone FROM public.realtor_preferences WHERE user_id=p_actor_id),'America/Chicago'))::DATE THEN
      RAISE EXCEPTION 'Invalid milestone evidence' USING ERRCODE='22023'; END IF;
    IF p_input->>'milestone' IN ('preparing','published','showing','offer_received','under_contract','closed') AND NOT public.seller_service_active_milestone(v_lead_id,'listing_agreement_verified') THEN
      RAISE EXCEPTION 'Verify the listing agreement first' USING ERRCODE='22023'; END IF;
    IF p_input->>'milestone'='closed' AND NOT EXISTS(SELECT 1 FROM public.seller_lead_events e WHERE e.lead_id=v_lead_id AND e.event_type='closing_recorded'
      AND NOT EXISTS(SELECT 1 FROM public.seller_lead_events v WHERE v.lead_id=v_lead_id AND v.event_type='outcome_voided' AND v.details->>'outcomeEventId'=e.id::TEXT)) THEN
      RAISE EXCEPTION 'Record the actual closing first' USING ERRCODE='22023'; END IF;
    details:=jsonb_build_object('milestone',p_input->>'milestone','occurredOn',p_input->>'occurredOn','evidence',p_input->>'evidence');
  ELSIF action='retract_milestone' THEN
    SELECT * INTO target FROM public.seller_case_events e WHERE e.id=(p_input->>'eventId')::UUID AND e.lead_id=v_lead_id AND e.kind='milestone'
      AND NOT EXISTS(SELECT 1 FROM public.seller_case_events r WHERE r.lead_id=e.lead_id AND r.kind='retract_milestone' AND r.details->>'milestoneEventId'=e.id::TEXT);
    IF target.id IS NULL OR COALESCE(length(btrim(p_input->>'reason')),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Active milestone and correction reason required' USING ERRCODE='22023'; END IF;
    IF target.details->>'milestone'='listing_agreement_verified' AND EXISTS(SELECT 1 FROM unnest(ARRAY['preparing','published','showing','offer_received','under_contract','closed']) m WHERE public.seller_service_active_milestone(v_lead_id,m)) THEN
      RAISE EXCEPTION 'Retract dependent listing milestones first' USING ERRCODE='22023'; END IF;
    UPDATE public.seller_cases c SET publication=NULL,published_at=NULL,sharing_enabled=false,shared_email=NULL WHERE c.lead_id=v_lead_id;
    details:=jsonb_build_object('milestoneEventId',target.id,'milestone',target.details->>'milestone','reason',btrim(p_input->>'reason'));
  ELSIF action='link_booking' THEN
    IF booking.id IS NULL OR booking.lead_id IS DISTINCT FROM v_lead_id OR booking.agent_id IS DISTINCT FROM lead.agent_id
      OR booking.site IS DISTINCT FROM lead.site OR booking.appointment_type<>'seller_consultation' OR booking.status<>'accepted' THEN
      RAISE EXCEPTION 'Accepted seller booking unavailable' USING ERRCODE='42501'; END IF;
    IF EXISTS(SELECT 1 FROM public.seller_case_booking_links l WHERE l.booking_id=booking.id) THEN RAISE EXCEPTION 'Booking already linked' USING ERRCODE='PT409'; END IF;
    receipt:=public.seller_lead_record_action(p_actor_id,jsonb_build_object('leadId',v_lead_id,'expectedRevision',lead.revision,'requestKey',v_request_key,
      'action','confirm_consultation','startsAt',booking.start_time,'confirmationBasis','confirmed_booking'));
    INSERT INTO public.seller_case_booking_links(booking_id,lead_id,consultation_event_id) VALUES(booking.id,v_lead_id,(receipt->>'eventId')::UUID);
    details:=jsonb_build_object('bookingId',booking.id,'consultationEventId',receipt->>'eventId','startsAt',booking.start_time);
  ELSIF action='publish_progress' THEN
    IF p_input->>'reviewed' IS DISTINCT FROM 'true' OR jsonb_typeof(p_input->'publication') IS DISTINCT FROM 'object'
      OR jsonb_typeof(p_input#>'{publication,milestones}') IS DISTINCT FROM 'array'
      OR jsonb_typeof(p_input#>'{publication,documents}') IS DISTINCT FROM 'array'
      OR jsonb_typeof(p_input#>'{publication,checklist}') IS DISTINCT FROM 'array'
      OR jsonb_typeof(p_input#>'{publication,summary}') IS DISTINCT FROM 'string'
      OR length(p_input#>>'{publication,summary}')>2000 THEN RAISE EXCEPTION 'Review progress before sharing' USING ERRCODE='22023'; END IF;
    -- Publish only recorded milestones and documents/checklist items in this case.
    IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_input#>'{publication,milestones}') AS m(milestone) WHERE NOT public.seller_service_active_milestone(v_lead_id,milestone))
      OR NOT (saved.documents @> (p_input#>'{publication,documents}'))
      OR NOT (saved.checklist @> (p_input#>'{publication,checklist}')) THEN RAISE EXCEPTION 'Share only saved case evidence' USING ERRCODE='22023'; END IF;
    UPDATE public.seller_cases c SET publication=jsonb_build_object('summary',p_input#>'{publication,summary}','milestones',p_input#>'{publication,milestones}','documents',(SELECT COALESCE(jsonb_agg(jsonb_build_object('label',d->'label','url',d->'url')),'[]') FROM jsonb_array_elements(p_input#>'{publication,documents}') d),'checklist',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',i->'id','title',i->'title','done',i->'done')),'[]') FROM jsonb_array_elements(p_input#>'{publication,checklist}') i)),published_at=now() WHERE c.lead_id=v_lead_id;
    details:=jsonb_build_object('publishedAt',now());
  ELSIF action='share_progress' THEN
    IF p_input->>'enabled'='true' AND (saved.publication IS NULL OR nullif(btrim(lead.email),'') IS NULL) THEN RAISE EXCEPTION 'Publish progress first' USING ERRCODE='22023'; END IF;
    UPDATE public.seller_cases c SET sharing_enabled=(p_input->>'enabled')::BOOLEAN,
      shared_email=CASE WHEN p_input->>'enabled'='true' THEN lower(btrim(lead.email)) ELSE NULL END WHERE c.lead_id=v_lead_id;
    details:=jsonb_build_object('enabled',(p_input->>'enabled')::BOOLEAN);
  ELSE
    IF length(btrim(p_input->>'subject')) NOT BETWEEN 1 AND 200 OR length(btrim(p_input->>'body')) NOT BETWEEN 1 AND 8000 THEN RAISE EXCEPTION 'Invalid message' USING ERRCODE='22023'; END IF;
    IF action='send_email' THEN
      IF p_input->>'reviewed' IS DISTINCT FROM 'true' OR lead.revision IS DISTINCT FROM (p_input->>'expectedLeadRevision')::INTEGER
        OR NOT public.seller_service_contact_allowed(lead) THEN RAISE EXCEPTION 'Contact permission changed' USING ERRCODE='PT409'; END IF;
      SELECT email INTO owner_email FROM auth.users WHERE id=p_actor_id AND email_confirmed_at IS NOT NULL;
      IF owner_email IS NULL THEN RAISE EXCEPTION 'Verify your email before sending' USING ERRCODE='42501'; END IF;
      IF length(COALESCE(p_input->>'fromAddress','')) NOT BETWEEN 1 AND 320 THEN RAISE EXCEPTION 'Configured sender required' USING ERRCODE='22023'; END IF;
      INSERT INTO public.seller_case_messages(lead_id,owner_id,direction,subject,body,recipient,reply_to,from_address,status,occurred_at)
        VALUES(v_lead_id,p_actor_id,'outbound',btrim(p_input->>'subject'),btrim(p_input->>'body'),lower(btrim(lead.email)),owner_email,p_input->>'fromAddress','queued',now()) RETURNING id INTO message_id;
      SELECT id INTO v_job_id FROM public.enqueue_workflow_event(p_actor_id,'seller_email','seller-email:'||message_id,
        jsonb_build_object('messageId',message_id),1,NULL);
      UPDATE public.seller_case_messages SET job_id=v_job_id WHERE id=message_id;
    ELSE
      IF p_input->>'direction' NOT IN ('inbound','outbound') OR (p_input->>'occurredAt')::TIMESTAMPTZ>now()+INTERVAL '5 minutes'
        OR (p_input->>'occurredAt')::TIMESTAMPTZ<lead.created_at-INTERVAL '5 minutes' THEN RAISE EXCEPTION 'Invalid conversation time' USING ERRCODE='22023'; END IF;
      receipt:=public.seller_lead_record_action(p_actor_id,jsonb_build_object('leadId',v_lead_id,'expectedRevision',lead.revision,'requestKey',v_request_key,
        'action',CASE WHEN p_input->>'direction'='inbound' THEN 'record_response' ELSE 'record_contact' END,
        'source','customer_reply','channel','email','occurredAt',p_input->>'occurredAt'));
      INSERT INTO public.seller_case_messages(lead_id,owner_id,direction,subject,body,status,occurred_at)
        VALUES(v_lead_id,p_actor_id,p_input->>'direction',btrim(p_input->>'subject'),btrim(p_input->>'body'),'recorded',(p_input->>'occurredAt')::TIMESTAMPTZ) RETURNING id INTO message_id;
    END IF;
    details:=jsonb_build_object('messageId',message_id);
  END IF;
  UPDATE public.seller_cases c SET revision=c.revision+1,updated_at=now() WHERE c.lead_id=v_lead_id RETURNING revision INTO saved.revision;
  result:=jsonb_build_object('leadId',v_lead_id,'revision',saved.revision,'details',details,'replayed',false);
  INSERT INTO public.seller_case_events(lead_id,actor_id,request_key,input_hash,kind,details,result) VALUES(v_lead_id,p_actor_id,v_request_key,hash,action,details,result);
  RETURN result;
END $$;

CREATE FUNCTION public.seller_case_booking_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE link public.seller_case_booking_links%ROWTYPE; lead public.agent_site_leads%ROWTYPE; actor UUID; receipt JSONB;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.start_time IS NOT DISTINCT FROM OLD.start_time AND NEW.lead_id IS NOT DISTINCT FROM OLD.lead_id AND NEW.agent_id IS NOT DISTINCT FROM OLD.agent_id AND NEW.site IS NOT DISTINCT FROM OLD.site THEN RETURN NEW; END IF;
  SELECT * INTO link FROM public.seller_case_booking_links WHERE booking_id=NEW.id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT owner_id INTO actor FROM public.seller_cases WHERE lead_id=link.lead_id;
  BEGIN lead:=public.seller_service_require_owner(actor,link.lead_id,true);
  EXCEPTION WHEN SQLSTATE 'P0002' THEN RETURN NEW; END;
  IF lead.status NOT IN ('closed','archived') AND link.consultation_event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.seller_lead_events e WHERE e.lead_id=link.lead_id AND e.event_type='consultation_cancelled' AND e.details->>'consultationEventId'=link.consultation_event_id::TEXT) THEN
    PERFORM public.seller_lead_record_action(actor,jsonb_build_object('leadId',lead.id,'expectedRevision',lead.revision,'requestKey',gen_random_uuid(),
      'action','cancel_consultation','consultationEventId',link.consultation_event_id));
    SELECT * INTO lead FROM public.agent_site_leads WHERE id=link.lead_id;
  END IF;
  IF NEW.status='accepted' AND NEW.lead_id=link.lead_id AND NEW.agent_id=lead.agent_id AND NEW.site=lead.site AND lead.status NOT IN ('archived','closed')
    AND NEW.start_time BETWEEN now()-INTERVAL '5 minutes' AND now()+INTERVAL '366 days' THEN
    receipt:=public.seller_lead_record_action(actor,jsonb_build_object('leadId',lead.id,'expectedRevision',lead.revision,'requestKey',gen_random_uuid(),
      'action','confirm_consultation','startsAt',NEW.start_time,'confirmationBasis','confirmed_booking'));
  END IF;
  UPDATE public.seller_case_booking_links SET consultation_event_id=(receipt->>'eventId')::UUID WHERE booking_id=NEW.id;
  UPDATE public.seller_cases SET revision=revision+1,updated_at=now() WHERE lead_id=link.lead_id;
  INSERT INTO public.seller_case_events(lead_id,actor_id,request_key,input_hash,kind,details,result)
    VALUES(link.lead_id,actor,gen_random_uuid(),'booking-change','booking_changed',jsonb_build_object('bookingId',NEW.id,'status',NEW.status,'startsAt',NEW.start_time),'{}');
  RETURN NEW;
END $$;
CREATE TRIGGER seller_case_booking_changed AFTER UPDATE OF status,start_time,lead_id,agent_id,site ON public.scheduling_bookings
  FOR EACH ROW EXECUTE FUNCTION public.seller_case_booking_changed();

CREATE FUNCTION public.seller_client_progress(p_actor_id UUID)
RETURNS SETOF JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
  SELECT jsonb_build_object('leadId',c.lead_id,'publication',c.publication,'publishedAt',c.published_at)
  FROM public.seller_cases c JOIN public.agent_site_leads l ON l.id=c.lead_id
    JOIN public.site_config s ON s.agent_id=l.agent_id AND s.owner_id=c.owner_id AND s.status='active'
    JOIN auth.users u ON u.id=p_actor_id AND u.email_confirmed_at IS NOT NULL
  WHERE c.sharing_enabled AND c.publication IS NOT NULL AND c.shared_email=lower(btrim(u.email))
    AND c.shared_email=lower(btrim(l.email)) ORDER BY c.published_at DESC LIMIT 50;
$$;

DO $$ DECLARE signature TEXT; BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'seller_service_require_owner(uuid,uuid,boolean)','seller_service_contact_allowed(public.agent_site_leads)',
    'seller_case_read(uuid,uuid)','seller_case_action(uuid,jsonb)','seller_client_progress(uuid)','seller_case_booking_changed()'
    ,'seller_service_active_milestone(uuid,text)'
  ] LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION public.'||signature||' FROM PUBLIC,anon,authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||signature||' TO service_role';
  END LOOP;
END $$;
