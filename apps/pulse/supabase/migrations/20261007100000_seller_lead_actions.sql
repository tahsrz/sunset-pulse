-- Owner-scoped seller requests and immutable, replayable business outcomes.

ALTER TABLE public.agent_site_leads
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);

CREATE FUNCTION public.seller_lead_revision_guard()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN
    NEW.revision := OLD.revision + 1;
  ELSE
    NEW.revision := OLD.revision;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER seller_lead_revision_guard
BEFORE UPDATE ON public.agent_site_leads
FOR EACH ROW EXECUTE FUNCTION public.seller_lead_revision_guard();

CREATE TABLE public.seller_lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.agent_site_leads(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_key UUID NOT NULL,
  input_hash TEXT NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'contact_attempted','customer_replied','consultation_confirmed','consultation_cancelled',
    'closing_recorded','outcome_voided','contact_permission_revoked'
  )),
  lead_revision INTEGER NOT NULL CHECK (lead_revision > 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(details) = 'object' AND octet_length(details::TEXT) <= 4096),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_key)
);

CREATE INDEX seller_lead_events_lead_time_idx
  ON public.seller_lead_events(lead_id, occurred_at, id);
CREATE INDEX seller_lead_events_owner_time_idx
  ON public.seller_lead_events(agent_id, occurred_at, id);
CREATE INDEX seller_lead_events_closing_ref_idx
  ON public.seller_lead_events(agent_id, (details->>'reference'))
  WHERE event_type = 'closing_recorded';
CREATE UNIQUE INDEX seller_lead_events_void_target_idx
  ON public.seller_lead_events(lead_id, (details->>'outcomeEventId'))
  WHERE event_type = 'outcome_voided';
CREATE UNIQUE INDEX seller_lead_events_cancel_target_idx
  ON public.seller_lead_events(lead_id, (details->>'consultationEventId'))
  WHERE event_type = 'consultation_cancelled';

ALTER TABLE public.seller_lead_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_lead_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.seller_lead_events TO service_role;
GRANT INSERT ON public.seller_lead_events TO service_role;

CREATE FUNCTION public.seller_lead_event_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Seller outcome history is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER seller_lead_events_immutable
BEFORE UPDATE OR DELETE ON public.seller_lead_events
FOR EACH ROW EXECUTE FUNCTION public.seller_lead_event_immutable();

DROP POLICY IF EXISTS "Operators can read agent site leads" ON public.agent_site_leads;
DROP POLICY IF EXISTS "Owners can read their seller requests" ON public.agent_site_leads;
CREATE POLICY "Owners can read their seller requests"
ON public.agent_site_leads FOR SELECT TO authenticated
USING (
  source = 'seller_plan'
  AND EXISTS (
      SELECT 1 FROM public.site_config AS site
      WHERE site.agent_id = agent_site_leads.agent_id
      AND site.owner_id = auth.uid() AND site.status = 'active'
  )
);

CREATE FUNCTION public.seller_lead_list_owned(
  p_actor_id UUID, p_limit INTEGER, p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL, p_lead_id UUID DEFAULT NULL
)
RETURNS SETOF JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_actor_id IS NULL OR p_limit NOT BETWEEN 1 AND 51 THEN
    RAISE EXCEPTION 'Invalid seller lead page' USING ERRCODE = '22023';
END IF;
  IF (p_before_created_at IS NULL) <> (p_before_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid seller lead cursor' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id',lead.id,'created_at',lead.created_at,'agent_id',lead.agent_id,'site',lead.site,
    'site_name',lead.site_name,'source',lead.source,'name',lead.name,'email',lead.email,
    'preferred_contact',lead.preferred_contact,'message',lead.message,'status',lead.status,
    'internal_note',lead.internal_note,'contact_attempted_at',lead.contact_attempted_at,
    'contact_channel',lead.contact_channel,'responded_at',lead.responded_at,
    'response_source',lead.response_source,'metadata',lead.metadata,'revision',lead.revision
  ) FROM public.agent_site_leads AS lead
  WHERE lead.source = 'seller_plan'
    AND EXISTS (
      SELECT 1 FROM public.site_config AS site
      WHERE site.agent_id = lead.agent_id AND site.owner_id = p_actor_id AND site.status = 'active'
    )
    AND (p_lead_id IS NULL OR lead.id = p_lead_id)
    AND (p_before_created_at IS NULL OR (lead.created_at, lead.id) < (p_before_created_at, p_before_id))
  ORDER BY lead.created_at DESC, lead.id DESC
  LIMIT p_limit;
END;
$$;

CREATE FUNCTION public.seller_lead_record_action(p_actor_id UUID, p_input JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  v_lead_id UUID;
  v_request_key UUID;
  expected_revision INTEGER;
  action_name TEXT;
  input_hash TEXT;
  lead public.agent_site_leads%ROWTYPE;
  owned_site public.site_config%ROWTYPE;
  prior public.seller_lead_events%ROWTYPE;
  target public.seller_lead_events%ROWTYPE;
  new_event public.seller_lead_events%ROWTYPE;
  event_type TEXT;
  event_time TIMESTAMPTZ;
  event_details JSONB := '{}'::JSONB;
  occurred TIMESTAMPTZ;
  resolved_revision INTEGER;
  consent JSONB;
  permission_grant JSONB;
  active_reference_event UUID;
  owner_time_zone TEXT;
BEGIN
  IF p_actor_id IS NULL OR jsonb_typeof(p_input) <> 'object'
    OR octet_length(p_input::TEXT) > 8192 THEN
    RAISE EXCEPTION 'Invalid seller action' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_lead_id := (p_input->>'leadId')::UUID;
    v_request_key := (p_input->>'requestKey')::UUID;
    expected_revision := (p_input->>'expectedRevision')::INTEGER;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Invalid seller action identity' USING ERRCODE = '22023';
  END;
  action_name := p_input->>'action';
  IF v_lead_id IS NULL OR v_request_key IS NULL OR expected_revision < 1
    OR action_name NOT IN ('record_contact','record_response','confirm_consultation',
      'cancel_consultation','record_closing','void_outcome','revoke_requested_contact') THEN
    RAISE EXCEPTION 'Invalid seller action identity' USING ERRCODE = '22023';
  END IF;
  input_hash := encode(digest(p_input::TEXT, 'sha256'), 'hex');

  -- A shared site lock fences owner transfer. Every seller action then locks
  -- its lead; site ownership cannot change between authorization and commit.
  SELECT site.* INTO owned_site FROM public.site_config AS site
  WHERE site.agent_id = (
    SELECT candidate.agent_id FROM public.agent_site_leads AS candidate WHERE candidate.id = v_lead_id
  ) AND site.owner_id = p_actor_id AND site.status = 'active'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller lead not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO lead FROM public.agent_site_leads AS candidate
  WHERE candidate.id = v_lead_id AND candidate.agent_id = owned_site.agent_id
    AND candidate.source = 'seller_plan'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller lead not found' USING ERRCODE = 'P0002'; END IF;

  SELECT event.* INTO prior FROM public.seller_lead_events AS event
  WHERE event.actor_id = p_actor_id AND event.request_key = v_request_key;
  IF FOUND THEN
    IF prior.input_hash <> input_hash OR prior.lead_id <> v_lead_id THEN
      RAISE EXCEPTION 'Seller action key was reused with different input' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('eventId',prior.id,'leadId',prior.lead_id,
      'leadRevision',prior.lead_revision,'eventType',prior.event_type,'replayed',TRUE);
  END IF;
  IF lead.revision <> expected_revision THEN
    RAISE EXCEPTION 'Seller lead changed before this action' USING ERRCODE = '40001';
  END IF;
  IF lead.status IN ('archived','closed') AND action_name NOT IN ('record_response','revoke_requested_contact','void_outcome')
    AND NOT (lead.status = 'closed' AND action_name = 'record_closing') THEN
    RAISE EXCEPTION 'Seller lead is closed or archived' USING ERRCODE = '22023';
  END IF;

  consent := COALESCE(lead.metadata->'sellerPlan', '{}'::JSONB);
  permission_grant := consent->'requestedContact';
  IF action_name = 'record_contact' THEN
    IF p_input->>'channel' IS DISTINCT FROM 'email'
      OR (permission_grant->>'granted' IS DISTINCT FROM 'true' AND consent#>>'{marketingOptIn,granted}' IS DISTINCT FROM 'true')
      OR (permission_grant ? 'revokedAt' AND consent#>>'{marketingOptIn,granted}' IS DISTINCT FROM 'true')
      OR lead.email IS NULL OR btrim(lead.email) = '' THEN
      RAISE EXCEPTION 'Seller request does not allow this contact' USING ERRCODE = '42501';
    END IF;
    IF lead.contact_attempted_at IS NOT NULL
      AND NOT (consent->'marketingOptIn'->>'granted' = 'true'
        OR lead.responded_at > lead.contact_attempted_at) THEN
      RAISE EXCEPTION 'Seller response has already been recorded' USING ERRCODE = '42501';
    END IF;
    IF lead.contact_attempted_at IS NULL AND permission_grant->>'granted' IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'The initial seller response requires requested-contact consent' USING ERRCODE = '42501';
    END IF;
    IF length(p_input->>'occurredAt') > 40 THEN RAISE EXCEPTION 'Invalid contact timestamp' USING ERRCODE='22023'; END IF;
    event_time := (p_input->>'occurredAt')::TIMESTAMPTZ;
    IF event_time IS NULL OR event_time > now() + INTERVAL '5 minutes'
      OR event_time < lead.created_at - INTERVAL '5 minutes' THEN
      RAISE EXCEPTION 'Invalid contact timestamp' USING ERRCODE = '22023';
    END IF;
    event_type := 'contact_attempted'; event_details := jsonb_build_object('channel','email');
    UPDATE public.agent_site_leads SET contact_attempted_at = event_time,
      contact_channel = 'email', contact_recorded_by = p_actor_id::TEXT,
      status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
      reviewed_at = COALESCE(reviewed_at,now())
    WHERE id = v_lead_id RETURNING revision INTO resolved_revision;
  ELSIF action_name = 'record_response' THEN
    IF p_input->>'source' IS DISTINCT FROM 'customer_reply' THEN
      RAISE EXCEPTION 'Only a customer reply is accepted here' USING ERRCODE = '22023';
    END IF;
    event_time := (p_input->>'occurredAt')::TIMESTAMPTZ;
    IF event_time IS NULL OR event_time > now() + INTERVAL '5 minutes'
      OR event_time < lead.created_at - INTERVAL '5 minutes' THEN
      RAISE EXCEPTION 'Invalid reply timestamp' USING ERRCODE = '22023';
    END IF;
    event_type := 'customer_replied'; event_details := '{}'::JSONB;
    UPDATE public.agent_site_leads SET responded_at = event_time,
      response_source = 'customer_reply', response_recorded_by = p_actor_id::TEXT
    WHERE id = v_lead_id RETURNING revision INTO resolved_revision;
  ELSIF action_name = 'confirm_consultation' THEN
    event_time := (p_input->>'startsAt')::TIMESTAMPTZ;
    IF event_time IS NULL OR event_time < now() - INTERVAL '5 minutes'
      OR event_time > now() + INTERVAL '366 days'
      OR p_input->>'confirmationBasis' NOT IN ('customer_reply','confirmed_booking') THEN
      RAISE EXCEPTION 'Invalid consultation confirmation' USING ERRCODE = '22023';
    END IF;
    event_type := 'consultation_confirmed';
    event_details := jsonb_build_object('confirmationBasis',p_input->>'confirmationBasis');
    UPDATE public.agent_site_leads SET status = 'touring', reviewed_at = COALESCE(reviewed_at,now())
    WHERE id = v_lead_id RETURNING revision INTO resolved_revision;
  ELSIF action_name = 'cancel_consultation' THEN
    SELECT event.* INTO target FROM public.seller_lead_events AS event
    WHERE event.id = (p_input->>'consultationEventId')::UUID
      AND event.lead_id = v_lead_id AND event.agent_id = lead.agent_id
      AND event.event_type = 'consultation_confirmed'
    FOR SHARE;
    IF NOT FOUND OR EXISTS (SELECT 1 FROM public.seller_lead_events AS cancelled
      WHERE cancelled.lead_id = v_lead_id AND cancelled.event_type = 'consultation_cancelled'
        AND cancelled.details->>'consultationEventId' = target.id::TEXT) THEN
      RAISE EXCEPTION 'Consultation is unavailable or already cancelled' USING ERRCODE = '40001';
    END IF;
    event_time := now(); event_type := 'consultation_cancelled';
    event_details := jsonb_build_object('consultationEventId',target.id);
    resolved_revision := lead.revision;
  ELSIF action_name = 'record_closing' THEN
    SELECT preferences.time_zone INTO owner_time_zone FROM public.realtor_preferences AS preferences
      WHERE preferences.user_id=p_actor_id;
    IF owner_time_zone IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=owner_time_zone) THEN
      RAISE EXCEPTION 'Seller owner timezone is unavailable' USING ERRCODE='22023';
    END IF;
    event_time := ((p_input->>'closedOn')::DATE::TIMESTAMP AT TIME ZONE owner_time_zone);
    IF p_input->>'reference' IS NULL OR char_length(btrim(p_input->>'reference')) NOT BETWEEN 1 AND 120
      OR event_time > now() + INTERVAL '1 day' OR event_time < lead.created_at - INTERVAL '1 day' THEN
      RAISE EXCEPTION 'Invalid seller closing details' USING ERRCODE = '22023';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext(lead.agent_id), hashtext(lower(btrim(p_input->>'reference'))));
    SELECT event.id INTO active_reference_event
    FROM public.seller_lead_events AS event
    WHERE event.agent_id = lead.agent_id
      AND lower(event.details->>'reference') = lower(btrim(p_input->>'reference'))
      AND event.event_type = 'closing_recorded'
      AND NOT EXISTS (
        SELECT 1 FROM public.seller_lead_events AS voided
        WHERE voided.event_type = 'outcome_voided'
          AND voided.details->>'outcomeEventId' = event.id::TEXT
      )
    LIMIT 1;
    IF active_reference_event IS NOT NULL THEN
      RAISE EXCEPTION 'This closing reference is already recorded' USING ERRCODE = '23505';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.seller_lead_events AS event
      WHERE event.lead_id = v_lead_id AND event.event_type = 'closing_recorded'
        AND NOT EXISTS (
          SELECT 1 FROM public.seller_lead_events AS voided
          WHERE voided.event_type = 'outcome_voided'
            AND voided.details->>'outcomeEventId' = event.id::TEXT
        )
    ) THEN
      RAISE EXCEPTION 'Void the existing closing before correcting it' USING ERRCODE = '40001';
    END IF;
    event_type := 'closing_recorded';
    event_details := jsonb_build_object('reference',btrim(p_input->>'reference'),'closedOn',p_input->>'closedOn');
    UPDATE public.agent_site_leads SET status = 'closed', reviewed_at = COALESCE(reviewed_at,now())
    WHERE id = v_lead_id RETURNING revision INTO resolved_revision;
  ELSIF action_name = 'void_outcome' THEN
    SELECT event.* INTO target FROM public.seller_lead_events AS event
    WHERE event.id = (p_input->>'outcomeEventId')::UUID AND event.lead_id = v_lead_id
      AND event.agent_id = lead.agent_id AND event.event_type = 'closing_recorded'
    FOR SHARE;
    IF NOT FOUND OR char_length(btrim(COALESCE(p_input->>'reason',''))) NOT BETWEEN 1 AND 200
      OR EXISTS (SELECT 1 FROM public.seller_lead_events AS voided
        WHERE voided.lead_id = v_lead_id AND voided.event_type='outcome_voided'
          AND voided.details->>'outcomeEventId' = target.id::TEXT) THEN
      RAISE EXCEPTION 'Seller outcome is unavailable or already voided' USING ERRCODE='40001';
    END IF;
    event_time := now(); event_type := 'outcome_voided';
    event_details := jsonb_build_object('outcomeEventId',target.id,'reason',btrim(p_input->>'reason'));
    resolved_revision := lead.revision;
  ELSE
    event_time := now(); event_type := 'contact_permission_revoked';
    event_details := jsonb_build_object('permission','requested_contact');
    UPDATE public.agent_site_leads SET metadata = jsonb_set(
      COALESCE(metadata,'{}'::JSONB), '{sellerPlan,requestedContact}',
      COALESCE(metadata#>'{sellerPlan,requestedContact}','{}'::JSONB)
        || jsonb_build_object('granted',FALSE,'revokedAt',now()), TRUE)
    WHERE id = v_lead_id RETURNING revision INTO resolved_revision;
  END IF;

  INSERT INTO public.seller_lead_events(lead_id,agent_id,actor_id,request_key,input_hash,
    event_type,lead_revision,occurred_at,details)
  VALUES(v_lead_id,lead.agent_id,p_actor_id,v_request_key,input_hash,event_type,
    resolved_revision,event_time,event_details) RETURNING * INTO new_event;
  RETURN jsonb_build_object('eventId',new_event.id,'leadId',v_lead_id,
    'leadRevision',resolved_revision,'eventType',event_type,'replayed',FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.seller_lead_list_owned(UUID,INTEGER,TIMESTAMPTZ,UUID,UUID),
  public.seller_lead_record_action(UUID,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seller_lead_list_owned(UUID,INTEGER,TIMESTAMPTZ,UUID,UUID),
  public.seller_lead_record_action(UUID,JSONB) TO service_role;
