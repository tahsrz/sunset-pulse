CREATE FUNCTION public.realtor_read_seller_daily_summary(
  p_actor_id UUID, p_workspace_id UUID, p_time_zone TEXT, p_local_start DATE, p_local_end DATE
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
DECLARE result JSONB; today_local DATE;
BEGIN
  IF NOT public.realtor_personal_access(p_actor_id,p_workspace_id)
    OR p_time_zone IS NULL OR length(p_time_zone)>80
    OR p_local_start IS NULL OR p_local_end IS NULL
    OR p_local_end<=p_local_start OR p_local_end-p_local_start>7 THEN
    RAISE EXCEPTION 'Invalid seller daily summary request' USING ERRCODE='22023';
  END IF;
  today_local := (now() AT TIME ZONE p_time_zone)::DATE;
  IF NOT EXISTS (SELECT 1 FROM public.site_config site WHERE site.owner_id=p_actor_id AND site.status='active') THEN
    RETURN jsonb_build_object('status','not_configured','timeZone',p_time_zone,
      'weekStartDate',p_local_start,'weekEndDate',p_local_end-1,'generatedAt',now());
  END IF;

  WITH owned AS MATERIALIZED (
    SELECT lead.* FROM public.agent_site_leads lead
    JOIN public.site_config site ON site.agent_id=lead.agent_id
      AND site.owner_id=p_actor_id AND site.status='active'
    WHERE lead.source='seller_plan'
  ), week_events AS (
    SELECT event.* FROM public.seller_lead_events event
    JOIN owned lead ON lead.id=event.lead_id
    WHERE event.occurred_at >= (p_local_start::TIMESTAMP AT TIME ZONE p_time_zone)
      AND event.occurred_at < (p_local_end::TIMESTAMP AT TIME ZONE p_time_zone)
  ), active_consultations AS (
    SELECT confirmed.* FROM public.seller_lead_events confirmed
    JOIN owned lead ON lead.id=confirmed.lead_id
    WHERE confirmed.event_type='consultation_confirmed'
      AND confirmed.occurred_at >= now() - INTERVAL '5 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.seller_lead_events cancelled
        WHERE cancelled.event_type='consultation_cancelled'
          AND cancelled.details->>'consultationEventId'=confirmed.id::TEXT)
  ), unscheduled AS (
    SELECT lead.id,lead.name,lead.created_at,lead.revision,lead.metadata#>>'{sellerPlan,timing}' AS timing
    FROM owned lead WHERE lead.status NOT IN ('archived','closed')
      AND lead.contact_attempted_at IS NULL
      AND lead.metadata#>>'{sellerPlan,requestedContact,granted}'='true'
      AND lead.metadata#>>'{sellerPlan,requestedContact,revokedAt}' IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.realtor_planner_items item
        WHERE item.source_lead_id=lead.id AND item.user_id=p_actor_id AND item.status='active')
    ORDER BY lead.created_at,lead.id LIMIT 6
  ), overdue AS (
    SELECT occurrence.id AS occurrence_id,occurrence.item_id,occurrence.effective_date,
      occurrence.effective_time,occurrence.title_snapshot,lead.id AS lead_id,lead.name
    FROM public.realtor_planner_items item
    JOIN public.realtor_planner_occurrences occurrence ON occurrence.item_id=item.id
      AND occurrence.user_id=item.user_id AND occurrence.workspace_id=item.workspace_id
    JOIN owned lead ON lead.id=item.source_lead_id
    WHERE item.user_id=p_actor_id AND item.status='active' AND occurrence.status='pending'
      AND occurrence.effective_date<today_local AND lead.status NOT IN ('archived','closed')
    ORDER BY occurrence.effective_date,occurrence.id LIMIT 6
  ), consultations AS (
    SELECT event.id AS event_id,event.lead_id,event.occurred_at,lead.name
    FROM active_consultations event JOIN owned lead ON lead.id=event.lead_id
    ORDER BY event.occurred_at,event.id LIMIT 6
  )
  SELECT jsonb_build_object(
    'status','available','timeZone',p_time_zone,'weekStartDate',p_local_start,
    'weekEndDate',p_local_end-1,'generatedAt',now(),
    'provenance','recorded seller requests and immutable business events',
    'counts',jsonb_build_object(
      'newRequests', (SELECT count(*) FROM owned lead WHERE lead.created_at >= (p_local_start::TIMESTAMP AT TIME ZONE p_time_zone)
        AND lead.created_at < (p_local_end::TIMESTAMP AT TIME ZONE p_time_zone)),
      'customerReplies', (SELECT count(DISTINCT event.lead_id) FROM week_events event WHERE event.event_type='customer_replied'),
      'confirmedConsultations', (SELECT count(DISTINCT event.id) FROM week_events event WHERE event.event_type='consultation_confirmed'
        AND NOT EXISTS (SELECT 1 FROM public.seller_lead_events cancelled WHERE cancelled.event_type='consultation_cancelled'
          AND cancelled.details->>'consultationEventId'=event.id::TEXT)),
      'recordedClosings', (SELECT count(DISTINCT event.id) FROM week_events event WHERE event.event_type='closing_recorded'
        AND NOT EXISTS (SELECT 1 FROM public.seller_lead_events voided WHERE voided.event_type='outcome_voided'
          AND voided.details->>'outcomeEventId'=event.id::TEXT))
    ),
    'unscheduledRequests',(SELECT COALESCE(jsonb_agg(to_jsonb(row_data)),'[]'::JSONB) FROM (SELECT * FROM unscheduled LIMIT 5) row_data),
    'unscheduledHasMore',(SELECT count(*)>5 FROM unscheduled),
    'overdueActions',(SELECT COALESCE(jsonb_agg(to_jsonb(row_data)),'[]'::JSONB) FROM (SELECT * FROM overdue LIMIT 5) row_data),
    'overdueHasMore',(SELECT count(*)>5 FROM overdue),
    'consultations',(SELECT COALESCE(jsonb_agg(to_jsonb(row_data)),'[]'::JSONB) FROM (SELECT * FROM consultations LIMIT 5) row_data),
    'consultationsHasMore',(SELECT count(*)>5 FROM consultations)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.realtor_read_seller_daily_summary(UUID,UUID,TEXT,DATE,DATE)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.realtor_read_seller_daily_summary(UUID,UUID,TEXT,DATE,DATE)
  TO service_role;
