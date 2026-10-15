-- Keep the legacy inbox action shapes, but make writes revision checked and replay safe.
ALTER TABLE public.agent_site_leads
  DROP CONSTRAINT IF EXISTS agent_site_leads_status_check,
  ADD CONSTRAINT agent_site_leads_status_check
    CHECK (status IN ('new','reviewed','contacted','touring','nurture','closed','archived'));

CREATE TABLE public.agent_site_lead_action_receipts (
  actor_key TEXT NOT NULL CHECK (char_length(actor_key) BETWEEN 1 AND 160),
  request_key UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.agent_site_leads(id) ON DELETE CASCADE,
  input_hash TEXT NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  response JSONB NOT NULL CHECK (jsonb_typeof(response)='object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_key,request_key)
);
ALTER TABLE public.agent_site_lead_action_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_site_lead_action_receipts FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.agent_apply_lead_action(p_actor_key TEXT,p_action JSONB,p_audit_user JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE
  v_lead_id UUID; v_request_key UUID; expected_revision INTEGER; action_name TEXT;
  input_hash TEXT; lead public.agent_site_leads%ROWTYPE; prior public.agent_site_lead_action_receipts%ROWTYPE;
  owned_site public.site_config%ROWTYPE;
  audit_entry JSONB; existing_audit JSONB; next_audit JSONB; action_at TIMESTAMPTZ:=now();
  actor_label TEXT; actor_role TEXT; next_status TEXT; note_value TEXT;
  response JSONB;
BEGIN
  IF p_actor_key IS NULL OR char_length(p_actor_key) NOT BETWEEN 1 AND 160
    OR jsonb_typeof(p_action)<>'object' OR octet_length(p_action::TEXT)>8192
    OR jsonb_typeof(p_audit_user)<>'object' THEN
    RAISE EXCEPTION 'Invalid lead action' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_lead_id := (p_action->>'id')::UUID;
    v_request_key := (p_action->>'requestKey')::UUID;
    expected_revision := (p_action->>'expectedRevision')::INTEGER;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Invalid lead action identity' USING ERRCODE='22023';
  END;
  action_name := p_action->>'action';
  IF v_lead_id IS NULL OR v_request_key IS NULL OR expected_revision<1 THEN
    RAISE EXCEPTION 'Invalid lead action identity' USING ERRCODE='22023';
  END IF;
  input_hash := encode(digest(p_action::TEXT,'sha256'),'hex');

  -- The site lock and lead lock fence owner transfer and concurrent changes.
  SELECT site.* INTO owned_site FROM public.site_config site
    JOIN public.agent_site_leads candidate ON candidate.agent_id=site.agent_id
    WHERE candidate.id=v_lead_id AND candidate.source='seller_plan'
      AND site.owner_id::TEXT=p_actor_key AND site.status='active'
    FOR SHARE OF site;
  IF FOUND THEN
    SELECT candidate.* INTO lead FROM public.agent_site_leads candidate
      WHERE candidate.id=v_lead_id AND candidate.source='seller_plan' FOR UPDATE;
  ELSE
    SELECT candidate.* INTO lead FROM public.agent_site_leads candidate
      WHERE candidate.id=v_lead_id AND candidate.source IS DISTINCT FROM 'seller_plan' FOR UPDATE;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found' USING ERRCODE='P0002'; END IF;

  SELECT receipt.* INTO prior FROM public.agent_site_lead_action_receipts receipt
    WHERE receipt.actor_key=p_actor_key AND receipt.request_key=v_request_key;
  IF FOUND THEN
    IF prior.input_hash<>input_hash OR prior.lead_id<>v_lead_id THEN
      RAISE EXCEPTION 'Lead action key was reused with different input' USING ERRCODE='23505';
    END IF;
    RETURN prior.response || jsonb_build_object('replayed',TRUE);
  END IF;
  IF lead.revision<>expected_revision THEN
    RAISE EXCEPTION 'Lead changed before this action' USING ERRCODE='40001';
  END IF;
  IF action_name NOT IN ('review','archive','restore','set_status','record_contact','record_response','note','set_value','disposition') THEN
    RAISE EXCEPTION 'Unsupported lead action' USING ERRCODE='22023';
  END IF;
  IF lead.source='seller_plan' AND action_name IN ('record_contact','record_response') THEN
    RAISE EXCEPTION 'Use the seller-specific outcome action' USING ERRCODE='22023';
  END IF;
  IF action_name='disposition' AND lead.source IS DISTINCT FROM 'jamie_public_guide' THEN
    RAISE EXCEPTION 'Lead disposition is only available for Jamie handoffs' USING ERRCODE='22023';
  END IF;
  IF action_name='set_value' AND p_action->'estimatedPipelineValue'='null'::JSONB
    AND p_action->'closedRevenue'='null'::JSONB THEN
    RAISE EXCEPTION 'At least one opportunity value is required' USING ERRCODE='22023';
  END IF;

  actor_label := COALESCE(NULLIF(p_audit_user->>'email',''),NULLIF(p_audit_user->>'name',''),p_actor_key);
  actor_role := COALESCE(NULLIF(p_audit_user->>'role',''),'Operator');
  next_status := lead.status;
  note_value := lead.internal_note;
  IF action_name='set_status' THEN next_status:=p_action->>'status';
  ELSIF action_name IN ('review','record_contact') AND lead.status='new' THEN next_status:='contacted';
  ELSIF action_name='archive' THEN next_status:='archived';
  ELSIF action_name='restore' THEN next_status:='new';
  ELSIF action_name='record_response' AND p_action->>'source'='appointment_booked' AND lead.status<>'closed' THEN next_status:='touring';
  ELSIF action_name='note' THEN note_value:=COALESCE(p_action->>'note','');
  END IF;

  audit_entry := jsonb_strip_nulls(jsonb_build_object(
    'id','audit-'||v_request_key::TEXT,'action',CASE WHEN action_name='set_status' THEN 'status_changed:'||next_status ELSE action_name END,
    'timestamp',action_at,'actor',actor_label,'actorRole',actor_role,
    'previousStatus',COALESCE(lead.status,'new'),'newStatus',COALESCE(next_status,lead.status,'new'),
    'note',CASE WHEN action_name='note' THEN p_action->>'note' END,
    'valueSource',CASE WHEN action_name='set_value' THEN p_action->>'valueSource' END,
    'channel',CASE WHEN action_name='record_contact' THEN p_action->>'channel' END,
    'responseSource',CASE WHEN action_name='record_response' THEN p_action->>'source' END
  ));
  existing_audit:=CASE WHEN jsonb_typeof(lead.metadata->'auditTrail')='array' THEN lead.metadata->'auditTrail' ELSE '[]'::JSONB END;
  SELECT COALESCE(jsonb_agg(value ORDER BY ordinal),'[]'::JSONB) INTO next_audit
    FROM (SELECT value,ordinal FROM jsonb_array_elements(jsonb_build_array(audit_entry)||existing_audit)
      WITH ORDINALITY AS trail(value,ordinal) ORDER BY ordinal LIMIT 30) bounded;

  UPDATE public.agent_site_leads SET
    status=next_status,
    reviewed_at=CASE WHEN action_name='review' OR (action_name IN ('record_contact','disposition') AND lead.status='new')
      OR (action_name='set_status' AND next_status<>'new' AND lead.status IS NULL)
      THEN action_at WHEN action_name='restore' THEN reviewed_at ELSE reviewed_at END,
    archived_at=CASE WHEN action_name='archive' OR (action_name='set_status' AND next_status='archived') THEN action_at
      WHEN action_name IN ('restore','review') OR (action_name='set_status' AND next_status<>'archived') THEN NULL ELSE archived_at END,
    internal_note=CASE WHEN action_name='note' THEN note_value ELSE internal_note END,
    contact_attempted_at=CASE WHEN action_name='record_contact' THEN action_at ELSE contact_attempted_at END,
    contact_channel=CASE WHEN action_name='record_contact' THEN p_action->>'channel' ELSE contact_channel END,
    contact_recorded_by=CASE WHEN action_name='record_contact' THEN actor_label ELSE contact_recorded_by END,
    responded_at=CASE WHEN action_name='record_response' THEN action_at ELSE responded_at END,
    response_source=CASE WHEN action_name='record_response' THEN p_action->>'source' ELSE response_source END,
    response_recorded_by=CASE WHEN action_name='record_response' THEN actor_label ELSE response_recorded_by END,
    estimated_pipeline_value=CASE WHEN action_name='set_value' THEN NULLIF(p_action->>'estimatedPipelineValue','null')::NUMERIC ELSE estimated_pipeline_value END,
    closed_revenue=CASE WHEN action_name='set_value' THEN NULLIF(p_action->>'closedRevenue','null')::NUMERIC ELSE closed_revenue END,
    value_currency=CASE WHEN action_name='set_value' THEN p_action->>'currency' ELSE value_currency END,
    value_source=CASE WHEN action_name='set_value' THEN p_action->>'valueSource' ELSE value_source END,
    valued_at=CASE WHEN action_name='set_value' THEN action_at ELSE valued_at END,
    valued_by=CASE WHEN action_name='set_value' THEN actor_label ELSE valued_by END,
    metadata=COALESCE(lead.metadata,'{}'::JSONB)||jsonb_build_object(
      'lastOperatorAction',jsonb_build_object('action',action_name,'at',action_at,'by',p_audit_user),
      'auditTrail',next_audit
    ) || CASE WHEN action_name='disposition' THEN jsonb_build_object('publicGuideDisposition',jsonb_build_object(
      'value',p_action->>'disposition','at',action_at,'by',p_audit_user)) ELSE '{}'::JSONB END
    WHERE id=v_lead_id RETURNING * INTO lead;

  response:=jsonb_build_object('ok',TRUE,'lead',jsonb_build_object(
    'id',lead.id,'status',lead.status,'internal_note',lead.internal_note,'reviewed_at',lead.reviewed_at,
    'archived_at',lead.archived_at,'contact_attempted_at',lead.contact_attempted_at,
    'contact_channel',lead.contact_channel,'contact_recorded_by',lead.contact_recorded_by,
    'responded_at',lead.responded_at,'response_source',lead.response_source,
    'response_recorded_by',lead.response_recorded_by,'estimated_pipeline_value',lead.estimated_pipeline_value,
    'closed_revenue',lead.closed_revenue,'value_currency',lead.value_currency,'value_source',lead.value_source,
    'valued_at',lead.valued_at,'valued_by',lead.valued_by,'metadata',lead.metadata,'revision',lead.revision
  ));
  INSERT INTO public.agent_site_lead_action_receipts(actor_key,request_key,lead_id,input_hash,response)
    VALUES(p_actor_key,v_request_key,v_lead_id,input_hash,response);
  RETURN response||jsonb_build_object('replayed',FALSE);
END $$;

REVOKE ALL ON FUNCTION public.agent_apply_lead_action(TEXT,JSONB,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.agent_apply_lead_action(TEXT,JSONB,JSONB) TO service_role;
