-- Keep active outcomes independent of bounded recent contact history.
CREATE INDEX seller_lead_events_outcome_page_idx
  ON public.seller_lead_events(lead_id,event_type,created_at DESC,id DESC)
  WHERE event_type IN ('consultation_confirmed','closing_recorded');

CREATE FUNCTION public.seller_lead_list_active_outcomes(
  p_actor_id UUID, p_lead_id UUID, p_event_type TEXT, p_limit INTEGER,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL, p_before_id UUID DEFAULT NULL
) RETURNS SETOF JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
BEGIN
  IF p_actor_id IS NULL OR p_lead_id IS NULL OR p_event_type IS NULL
    OR p_event_type NOT IN ('consultation_confirmed','closing_recorded')
    OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 51
    OR (p_before_created_at IS NULL) <> (p_before_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid seller outcome page' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  SELECT jsonb_build_object('id',event.id,'event_type',event.event_type,
    'lead_revision',event.lead_revision,'occurred_at',event.occurred_at,
    'created_at',event.created_at,'details',event.details)
  FROM public.agent_site_leads lead
  JOIN public.site_config site ON site.agent_id=lead.agent_id
    AND site.owner_id=p_actor_id AND site.status='active'
  JOIN public.seller_lead_events event ON event.lead_id=lead.id
    AND event.agent_id=lead.agent_id
  WHERE lead.id=p_lead_id AND lead.source='seller_plan' AND event.event_type=p_event_type
    AND event.event_type IN ('consultation_confirmed','closing_recorded')
    AND (p_before_created_at IS NULL OR (event.created_at,event.id)<(p_before_created_at,p_before_id))
    AND NOT EXISTS (
      SELECT 1 FROM public.seller_lead_events reversal
      WHERE reversal.lead_id=lead.id AND reversal.agent_id=lead.agent_id
        AND ((p_event_type='consultation_confirmed' AND reversal.event_type='consultation_cancelled'
          AND reversal.details->>'consultationEventId'=event.id::TEXT)
          OR (p_event_type='closing_recorded' AND reversal.event_type='outcome_voided'
          AND reversal.details->>'outcomeEventId'=event.id::TEXT))
    )
  ORDER BY event.created_at DESC,event.id DESC LIMIT p_limit;
END $$;

-- A page of busy leads must not consume the event budget of another lead.
CREATE FUNCTION public.seller_lead_read_recent_events(p_actor_id UUID,p_lead_ids UUID[])
RETURNS TABLE(lead_id UUID,id UUID,event_type TEXT,lead_revision INTEGER,occurred_at TIMESTAMPTZ,details JSONB)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
BEGIN
  IF p_actor_id IS NULL OR p_lead_ids IS NULL OR cardinality(p_lead_ids)>100
    OR array_position(p_lead_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid seller event request' USING ERRCODE='22023';
  END IF;
  RETURN QUERY
  SELECT lead.id,event.id,event.event_type,event.lead_revision,event.occurred_at,event.details
  FROM public.agent_site_leads lead
  JOIN public.site_config site ON site.agent_id=lead.agent_id
    AND site.owner_id=p_actor_id AND site.status='active'
  CROSS JOIN LATERAL (
    SELECT recent.* FROM public.seller_lead_events recent
    WHERE recent.lead_id=lead.id AND recent.agent_id=lead.agent_id
    ORDER BY recent.occurred_at DESC,recent.id DESC LIMIT 20
  ) event
  WHERE lead.id=ANY(p_lead_ids) AND lead.source='seller_plan';
END $$;

REVOKE ALL ON FUNCTION public.seller_lead_list_active_outcomes(UUID,UUID,TEXT,INTEGER,TIMESTAMPTZ,UUID)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_lead_list_active_outcomes(UUID,UUID,TEXT,INTEGER,TIMESTAMPTZ,UUID)
  TO service_role;
REVOKE ALL ON FUNCTION public.seller_lead_read_recent_events(UUID,UUID[])
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_lead_read_recent_events(UUID,UUID[]) TO service_role;
