CREATE TABLE public.seller_offer_events (
  agent_id TEXT NOT NULL REFERENCES public.site_config(agent_id), site TEXT NOT NULL,
  visit_id UUID NOT NULL, event_type TEXT NOT NULL CHECK(event_type IN ('visit','offer_click')),
  campaign_key TEXT NOT NULL CHECK(length(campaign_key)<=100), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(agent_id,site,visit_id,event_type)
);
CREATE INDEX seller_offer_events_period ON public.seller_offer_events(agent_id,created_at);
ALTER TABLE public.seller_offer_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.seller_offer_events FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.seller_offer_record(p_agent_id TEXT,p_site TEXT,p_visit_id UUID,p_type TEXT,p_campaign TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.site_config WHERE agent_id=p_agent_id AND status='active')
    OR p_visit_id IS NULL OR p_site IS NULL OR length(p_site)>63 THEN RAISE EXCEPTION 'Offer unavailable' USING ERRCODE='22023'; END IF;
  -- Retain anonymous observations for 90 days; no identity or raw referrer columns.
  DELETE FROM public.seller_offer_events WHERE agent_id=p_agent_id AND created_at<now()-INTERVAL '90 days';
  INSERT INTO public.seller_offer_events(agent_id,site,visit_id,event_type,campaign_key)
    VALUES(p_agent_id,p_site,p_visit_id,p_type,p_campaign) ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION public.seller_service_funnel(p_actor_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
DECLARE start_at TIMESTAMPTZ; zone TEXT; result JSONB;
BEGIN
  SELECT time_zone INTO zone FROM public.realtor_preferences WHERE user_id=p_actor_id;
  zone:=COALESCE(zone,'America/Chicago'); start_at:=(((now() AT TIME ZONE zone)::DATE-29)::TIMESTAMP AT TIME ZONE zone);
  WITH owned AS MATERIALIZED (
    SELECT l.* FROM public.agent_site_leads l JOIN public.site_config s ON s.agent_id=l.agent_id AND s.owner_id=p_actor_id AND s.status='active'
      WHERE l.source='seller_plan' AND l.created_at>=start_at
  ), cohort AS (
    SELECT l.id,COALESCE(nullif(lower(btrim(l.metadata#>>'{campaign,campaign}')),''),'unattributed/unknown') campaign,
      EXISTS(SELECT 1 FROM public.seller_lead_events e WHERE e.lead_id=l.id AND e.event_type='customer_replied') replied,
      (EXISTS(SELECT 1 FROM public.seller_cases c WHERE c.lead_id=l.id AND c.owner_id=p_actor_id) AND public.seller_service_active_milestone(l.id,'consultation_held')) held,
      (EXISTS(SELECT 1 FROM public.seller_cases c WHERE c.lead_id=l.id AND c.owner_id=p_actor_id) AND public.seller_service_active_milestone(l.id,'listing_agreement_verified')) signed,
      EXISTS(SELECT 1 FROM public.seller_lead_events e WHERE e.lead_id=l.id AND e.event_type='closing_recorded' AND NOT EXISTS(SELECT 1 FROM public.seller_lead_events v WHERE v.lead_id=l.id AND v.event_type='outcome_voided' AND v.details->>'outcomeEventId'=e.id::TEXT)) closed
    FROM owned l
  ), observations AS (
    SELECT e.* FROM public.seller_offer_events e JOIN public.site_config s ON s.agent_id=e.agent_id AND s.owner_id=p_actor_id AND s.status='active' WHERE e.created_at>=start_at
  ), campaign_counts AS (
    SELECT campaign,count(*) requests,count(*) FILTER(WHERE replied) replies,count(*) FILTER(WHERE held) held,count(*) FILTER(WHERE signed) signed,count(*) FILTER(WHERE closed) closed FROM cohort GROUP BY campaign
  )
  SELECT jsonb_build_object('startAt',start_at,'timeZone',zone,'generatedAt',now(),
    'visits',(SELECT count(*) FROM observations WHERE event_type='visit'),'offerClicks',(SELECT count(*) FROM observations WHERE event_type='offer_click'),
    'requests',(SELECT count(*) FROM cohort),'replies',(SELECT count(*) FROM cohort WHERE replied),
    'held',(SELECT count(*) FROM cohort WHERE held),'signed',(SELECT count(*) FROM cohort WHERE signed),'closed',(SELECT count(*) FROM cohort WHERE closed),
    'campaigns',COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT * FROM campaign_counts ORDER BY campaign LIMIT 50) c),'[]'),
    'hasMoreCampaigns',(SELECT count(*)>50 FROM campaign_counts)) INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.seller_service_health(p_actor_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object(
   'plannerConfigured',EXISTS(SELECT 1 FROM public.realtor_preferences WHERE user_id=p_actor_id),
   'timeZone',(SELECT time_zone FROM public.realtor_preferences WHERE user_id=p_actor_id),
   'remindersEnabled',COALESCE((SELECT reminders_enabled FROM public.realtor_preferences WHERE user_id=p_actor_id),false),
   'activeSites',(SELECT count(*) FROM public.site_config WHERE owner_id=p_actor_id AND status='active'),
   'emailContractEnabled',COALESCE((SELECT enabled FROM public.workflow_event_contracts WHERE workflow_key='seller_email'),false),
   'pendingJobs',(SELECT count(*) FROM public.workflow_jobs WHERE user_id=p_actor_id AND workflow_key IN ('seller_email','realtor_reminder','realtor_planner') AND status IN ('queued','running')),
   'failedJobs',(SELECT count(*) FROM public.workflow_jobs WHERE user_id=p_actor_id AND workflow_key IN ('seller_email','realtor_reminder','realtor_planner') AND status='failed'),
   'lastCompletedJob',(SELECT max(updated_at) FROM public.workflow_jobs WHERE user_id=p_actor_id AND workflow_key IN ('seller_email','realtor_reminder','realtor_planner') AND status='completed'),
   'lastRequest',(SELECT max(l.created_at) FROM public.agent_site_leads l JOIN public.site_config s ON s.agent_id=l.agent_id AND s.owner_id=p_actor_id AND s.status='active' WHERE l.source='seller_plan'),
   'unresolvedEmails',(SELECT count(*) FROM public.seller_case_messages m JOIN public.seller_cases c ON c.lead_id=m.lead_id JOIN public.agent_site_leads l ON l.id=c.lead_id JOIN public.site_config s ON s.agent_id=l.agent_id AND s.owner_id=p_actor_id AND s.status='active' WHERE m.owner_id=p_actor_id AND m.status IN ('unknown','bounced','failed'))
 );
$$;
CREATE FUNCTION public.seller_service_priorities(p_actor_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
 WITH owned AS MATERIALIZED (
   SELECT l.* FROM public.agent_site_leads l JOIN public.site_config s ON s.agent_id=l.agent_id AND s.owner_id=p_actor_id AND s.status='active'
     WHERE l.source='seller_plan' AND l.status NOT IN ('closed','archived')
 ), priorities AS (
   SELECT 'reply:'||l.id AS id,l.id AS "leadId",l.name AS title,'A seller replied; no pending response task is scheduled.' AS reason,80 AS score,l.responded_at AS "dueAt"
   FROM owned l WHERE l.responded_at IS NOT NULL AND (l.contact_attempted_at IS NULL OR l.responded_at>l.contact_attempted_at)
     AND public.seller_service_contact_allowed(l)
     AND NOT EXISTS(SELECT 1 FROM public.realtor_planner_items i JOIN public.realtor_planner_occurrences o ON o.item_id=i.id AND o.status='pending' WHERE i.source_lead_id=l.id AND i.user_id=p_actor_id AND i.status='active')
   UNION ALL
   SELECT 'checklist:'||l.id,l.id,l.name,'Preparation checklist has unfinished work; open the case to schedule it.',30,c.updated_at
   FROM owned l JOIN public.seller_cases c ON c.lead_id=l.id AND c.owner_id=p_actor_id
   WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(c.checklist) item WHERE item->>'done'='false')
   UNION ALL
   SELECT 'booking:'||b.id,l.id,l.name,'Accepted consultation booking needs linking and a planner appointment.',60,b.start_time
   FROM owned l JOIN public.scheduling_bookings b ON b.lead_id=l.id AND b.agent_id=l.agent_id AND b.site=l.site AND b.status='accepted' AND b.appointment_type='seller_consultation'
   WHERE NOT EXISTS(SELECT 1 FROM public.seller_case_booking_links link WHERE link.booking_id=b.id)
 ), bounded AS (SELECT * FROM priorities ORDER BY score DESC,"dueAt",id LIMIT 21)
 SELECT jsonb_build_object('items',COALESCE((SELECT jsonb_agg(to_jsonb(row)) FROM (SELECT * FROM bounded LIMIT 20) row),'[]'),'hasMore',(SELECT count(*)>20 FROM bounded));
$$;
REVOKE ALL ON FUNCTION public.seller_offer_record(TEXT,TEXT,UUID,TEXT,TEXT),public.seller_service_funnel(UUID),public.seller_service_health(UUID),public.seller_service_priorities(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seller_offer_record(TEXT,TEXT,UUID,TEXT,TEXT),public.seller_service_funnel(UUID),public.seller_service_health(UUID),public.seller_service_priorities(UUID) TO service_role;
